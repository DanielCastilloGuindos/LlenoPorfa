import { apiUrl } from '../utils/apiBase';

const DEVICE_ID_KEY = 'llenoporfa_device_id_v1';

let cachedDeviceId: string | null = null;
let currentSessionId: string | null = null;

function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  if (typeof window === 'undefined') return 'server_render';

  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    cachedDeviceId = id;
    return id;
  } catch (e) {
    return `temp_${Math.random().toString(36).substring(2, 10)}`;
  }
}

function getSessionId(): string {
  if (currentSessionId) return currentSessionId;
  currentSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return currentSessionId;
}

function getPlatformInfo(): { platform: string; isPwa: boolean } {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', isPwa: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const platform = isIos ? 'ios' : isAndroid ? 'android' : 'desktop';

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isStandaloneNav = (navigator as any).standalone === true;
  const isPwa = isStandaloneMedia || isStandaloneNav;

  return { platform, isPwa };
}

export function useTelemetry() {
  const trackEvent = (
    eventType: string,
    details?: {
      stationId?: string;
      stationBrand?: string;
      fuelType?: string;
      province?: string;
      lat?: number;
      lng?: number;
      metadata?: Record<string, any>;
    }
  ) => {
    if (typeof window === 'undefined') return;

    try {
      const { platform, isPwa } = getPlatformInfo();
      const payload = {
        device_id: getDeviceId(),
        session_id: getSessionId(),
        event_type: eventType,
        station_id: details?.stationId,
        station_brand: details?.stationBrand,
        fuel_type: details?.fuelType,
        province: details?.province,
        lat: details?.lat,
        lng: details?.lng,
        created_at: Date.now(),
        metadata: {
          platform,
          mode: isPwa ? 'pwa_standalone' : 'browser',
          ...details?.metadata,
        },
      };

      const bodyStr = JSON.stringify(payload);

      const targetUrl = apiUrl('/api/register/event');

      // Prefer non-blocking sendBeacon if available, otherwise fetch with keepalive
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([bodyStr], { type: 'application/json' });
        const queued = navigator.sendBeacon(targetUrl, blob);
        if (queued) return;
      }

      fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      // Telemetry must never crash the UI
    }
  };

  return {
    trackEvent,
    getDeviceId,
    getSessionId,
  };
}
