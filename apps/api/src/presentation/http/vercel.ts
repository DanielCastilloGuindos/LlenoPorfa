import type { IncomingMessage, ServerResponse } from 'node:http';

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestHeader(req: IncomingMessage, name: string): string | undefined {
  return firstHeader(req.headers[name.toLowerCase()]);
}

export function getRequestUrl(req: IncomingMessage): URL {
  const protocol = getRequestHeader(req, 'x-forwarded-proto')?.split(',')[0].trim() || 'https';
  const host = getRequestHeader(req, 'host') || 'localhost';
  return new URL(req.url || '/', `${protocol}://${host}`);
}

export async function writeWebResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
