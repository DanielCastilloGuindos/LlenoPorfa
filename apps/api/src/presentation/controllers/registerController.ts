import { corsHeaders } from './stationsController';

// Local in-memory or graceful handler for telemetry in local dev
interface TelemetryEvent {
  id: string;
  created_at: number;
  device_id: string;
  session_id: string;
  event_type: string;
  station_id?: string;
  station_brand?: string;
  fuel_type?: string;
  province?: string;
  lat?: number;
  lng?: number;
  metadata_json?: string;
}

const inMemoryEvents: TelemetryEvent[] = [];

export async function handleRegisterEvent(req: Request): Promise<Response> {
  try {
    const body: any = await req.json();
    const incoming = Array.isArray(body) ? body : body.events || [body];

    for (const ev of incoming) {
      if (ev && ev.event_type) {
        inMemoryEvents.push({
          id: ev.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          created_at: ev.created_at || Date.now(),
          device_id: ev.device_id || 'dev-device',
          session_id: ev.session_id || 'dev-session',
          event_type: ev.event_type,
          station_id: ev.station_id,
          station_brand: ev.station_brand,
          fuel_type: ev.fuel_type,
          province: ev.province,
          lat: ev.lat,
          lng: ev.lng,
          metadata_json: ev.metadata_json ? JSON.stringify(ev.metadata_json) : undefined,
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok', ingested: incoming.length }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }
}

export async function handleRegisterStats(url: URL): Promise<Response> {
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const now = Date.now();
  const cutoff = now - days * 86400 * 1000;

  const recent = inMemoryEvents.filter((e) => e.created_at >= cutoff);

  const eventTypes: Record<string, number> = {};
  for (const e of recent) {
    eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
  }

  return new Response(
    JSON.stringify({
      total_events: recent.length,
      days,
      breakdown: eventTypes,
      recent: recent.slice(-50),
    }),
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}
