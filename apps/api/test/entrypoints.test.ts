import { describe, expect, it } from 'bun:test';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ResponseRecorder = {
  statusCode: number;
  body: string;
  setHeader(name: string, value: unknown): ResponseRecorder;
  end(body?: string | Uint8Array): void;
};

function createRequest(url: string): IncomingMessage {
  return { url, headers: { host: 'example.test' } } as IncomingMessage;
}

function createResponse(): { response: ServerResponse; recorder: ResponseRecorder } {
  const recorder: ResponseRecorder = {
    statusCode: 0,
    body: '',
    setHeader() {
      return recorder;
    },
    end(body) {
      recorder.body = body === undefined ? '' : typeof body === 'string' ? body : Buffer.from(body).toString('utf8');
    },
  };

  return { response: recorder as unknown as ServerResponse, recorder };
}

describe('Vercel API entrypoints', () => {
  it('serves the health check without requiring a database connection', async () => {
    const module = await import('../api/health.ts');
    const { response, recorder } = createResponse();
    module.default(createRequest('/api/health'), response);
    const body = JSON.parse(recorder.body);

    expect(recorder.statusCode).toBe(200);
    expect(body).toMatchObject({ ok: true, service: 'lleno-porfa-api' });
  });

  it('serves filters without requiring a database connection', async () => {
    const previousVercel = process.env.VERCEL;
    const previousTursoUrl = process.env.TURSO_DATABASE_URL;
    const previousTursoToken = process.env.TURSO_AUTH_TOKEN;

    process.env.VERCEL = '1';
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    try {
      const module = await import('../api/filters.ts');
      const { response, recorder } = createResponse();
      await module.default(createRequest('/api/filters'), response);
      const body = JSON.parse(recorder.body);

      expect(recorder.statusCode).toBe(200);
      expect(body.fuels.length).toBeGreaterThan(0);
    } finally {
      if (previousVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = previousVercel;

      if (previousTursoUrl === undefined) delete process.env.TURSO_DATABASE_URL;
      else process.env.TURSO_DATABASE_URL = previousTursoUrl;

      if (previousTursoToken === undefined) delete process.env.TURSO_AUTH_TOKEN;
      else process.env.TURSO_AUTH_TOKEN = previousTursoToken;
    }
  });

  it('imports the ESM stations handler and executes the Request routing path', async () => {
    const module = await import('../api/stations.ts');
    expect(typeof module.default).toBe('function');

    process.env.SQLITE_PATH = `/tmp/opencode/llenoporfa-entrypoint-${Date.now()}.db`;
    const { response, recorder } = createResponse();
    await module.default(createRequest('/api/stations?fuel=g95_e5'), response);
    expect(recorder.statusCode).toBe(200);
    expect(JSON.parse(recorder.body).fuel).toBe('g95_e5');

    // The handler reaches the database only after importing successfully. This
    // smoke test keeps the production entrypoint compatible with Vercel's Node runtime.
    const source = await Bun.file(new URL('../api/stations.ts', import.meta.url)).text();
    expect(source).not.toMatch(/require\s*\(|module\.exports/);
    expect(source).toMatch(/export default/);
  });

  it('keeps all Vercel entrypoints free of ambiguous module syntax', async () => {
    for (const entrypoint of ['filters', 'market', 'stations', 'sync']) {
      const source = await Bun.file(new URL(`../api/${entrypoint}.ts`, import.meta.url)).text();
      expect(source).not.toMatch(/require\s*\(|module\.exports/);
      expect(source).toMatch(/import\s/);
      expect(source).toMatch(/export default/);
      const relativeSpecifiers = [...source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)].map((match) => match[1]);
      expect(relativeSpecifiers.every((specifier) => specifier.endsWith('.js'))).toBe(true);
    }
  });
});
