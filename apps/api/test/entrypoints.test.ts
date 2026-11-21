import { describe, expect, it } from 'bun:test';

describe('Vercel API entrypoints', () => {
  it('imports the ESM stations handler and executes the Request routing path', async () => {
    const module = await import('../api/stations.ts');
    expect(typeof module.default).toBe('function');

    process.env.SQLITE_PATH = `/tmp/opencode/llenoporfa-entrypoint-${Date.now()}.db`;
    const response = await module.default(new Request('https://example.test/api/stations?fuel=g95_e5'));
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);

    // The handler reaches the database only after importing successfully. This
    // smoke test keeps the production entrypoint a real ESM module and verifies
    // the Request contract without requiring Vercel's build runtime.
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
