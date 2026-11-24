export default function handler(_req: Request): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'lleno-porfa-api',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
}
