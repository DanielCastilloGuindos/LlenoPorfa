import { ref } from 'vue';
import type { Station, FuelId } from '../types';
import { useGeolocation } from './useGeolocation';
import { useTelemetry } from './useTelemetry';

const PENDING_VISIT_KEY = 'llenoporfa_pending_visit_v1';
const CONFIRMED_HISTORY_KEY = 'llenoporfa_confirmed_visits_v1';
const PROXIMITY_THRESHOLD_KM = 0.12; // 120 meters
const MAX_PENDING_AGE_MS = 60 * 60 * 1000; // 60 minutes
const DEDUPLICATION_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface PendingVisit {
  stationId: string;
  stationName: string;
  address: string;
  province?: string;
  lat: number;
  lng: number;
  price?: number;
  fuel?: FuelId;
  navApp: string;
  timestamp: number;
}

export interface ArrivalPromptData extends PendingVisit {
  distanceMeters: number;
}

const arrivalPrompt = ref<ArrivalPromptData | null>(null);
let isInitialized = false;
let checkIntervalTimer: any = null;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useVisitDetector() {
  const { locationState, requestCurrentLocation } = useGeolocation();
  const { trackEvent } = useTelemetry();

  const getPendingVisit = (): PendingVisit | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(PENDING_VISIT_KEY);
      if (!raw) return null;
      const visit: PendingVisit = JSON.parse(raw);
      if (Date.now() - visit.timestamp > MAX_PENDING_AGE_MS) {
        localStorage.removeItem(PENDING_VISIT_KEY);
        return null;
      }
      return visit;
    } catch (e) {
      return null;
    }
  };

  const clearPendingVisit = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PENDING_VISIT_KEY);
    }
  };

  const registerPendingVisit = (station: Station, navApp: string, currentFuel?: FuelId) => {
    if (typeof window === 'undefined') return;

    const pending: PendingVisit = {
      stationId: station.id,
      stationName: station.brand,
      address: station.address,
      province: station.province,
      lat: station.latitude,
      lng: station.longitude,
      price: station.selected_fuel_price ?? undefined,
      fuel: currentFuel || 'g95_e5',
      navApp,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(PENDING_VISIT_KEY, JSON.stringify(pending));
    } catch (e) {}

    trackEvent('navigation_started', {
      stationId: station.id,
      stationBrand: station.brand,
      fuelType: currentFuel || 'g95_e5',
      province: station.province,
      lat: station.latitude,
      lng: station.longitude,
      metadata: { nav_app: navApp },
    });
  };

  const checkProximity = async () => {
    const pending = getPendingVisit();
    if (!pending) return;

    let userLat = locationState.value.coords?.lat;
    let userLng = locationState.value.coords?.lng;

    if (!userLat || !userLng) {
      try {
        await requestCurrentLocation();
        userLat = locationState.value.coords?.lat;
        userLng = locationState.value.coords?.lng;
      } catch (e) {
        return;
      }
    }

    if (!userLat || !userLng) return;

    const distKm = haversineKm(userLat, userLng, pending.lat, pending.lng);

    if (distKm <= PROXIMITY_THRESHOLD_KM) {
      // Check deduplication
      try {
        const histRaw = localStorage.getItem(CONFIRMED_HISTORY_KEY);
        const history: Record<string, number> = histRaw ? JSON.parse(histRaw) : {};
        const lastVisitTime = history[pending.stationId] || 0;

        if (Date.now() - lastVisitTime < DEDUPLICATION_INTERVAL_MS) {
          clearPendingVisit();
          return;
        }

        // Record confirmed visit
        history[pending.stationId] = Date.now();
        localStorage.setItem(CONFIRMED_HISTORY_KEY, JSON.stringify(history));
      } catch (e) {}

      // Fire telemetry
      const distM = Math.round(distKm * 1000);
      trackEvent('station_visit_confirmed', {
        stationId: pending.stationId,
        stationBrand: pending.stationName,
        fuelType: pending.fuel,
        province: pending.province,
        lat: pending.lat,
        lng: pending.lng,
        metadata: {
          distance_meters: distM,
          nav_app_origin: pending.navApp,
          latency_minutes: Math.round((Date.now() - pending.timestamp) / 60000),
        },
      });

      arrivalPrompt.value = {
        ...pending,
        distanceMeters: distM,
      };

      clearPendingVisit();
    }
  };

  const dismissArrivalPrompt = () => {
    arrivalPrompt.value = null;
  };

  const initVisitDetector = () => {
    if (typeof window === 'undefined' || isInitialized) return;
    isInitialized = true;

    // Check immediately on launch
    checkProximity();

    // Check whenever user switches tabs or returns to the app from Google Maps/Waze
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkProximity();
      }
    });

    // Check periodically if pending visit is active
    checkIntervalTimer = setInterval(() => {
      if (getPendingVisit()) {
        checkProximity();
      }
    }, 45000);
  };

  return {
    arrivalPrompt,
    registerPendingVisit,
    dismissArrivalPrompt,
    initVisitDetector,
    checkProximity,
  };
}
