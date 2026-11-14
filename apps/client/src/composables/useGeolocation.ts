import { ref, onMounted } from 'vue';
import type { Coordinates } from '../types';

export interface LocationState {
  coords: Coordinates | null;
  name: string;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const locationState = ref<LocationState>({
  coords: { lat: 40.4168, lng: -3.7038 }, // Default: Madrid center
  name: 'Madrid Centro',
  loading: false,
  error: null,
  permissionDenied: false,
});

// Common Spanish cities for quick selection when GPS is disabled
export const POPULAR_LOCATIONS: { name: string; coords: Coordinates }[] = [
  { name: 'Madrid', coords: { lat: 40.4168, lng: -3.7038 } },
  { name: 'Barcelona', coords: { lat: 41.3879, lng: 2.1699 } },
  { name: 'Valencia', coords: { lat: 39.4699, lng: -0.3763 } },
  { name: 'Sevilla', coords: { lat: 37.3891, lng: -5.9845 } },
  { name: 'Zaragoza', coords: { lat: 41.6488, lng: -0.8891 } },
  { name: 'Málaga', coords: { lat: 36.7213, lng: -4.4214 } },
  { name: 'Bilbao', coords: { lat: 43.2630, lng: -2.9350 } },
  { name: 'A Coruña', coords: { lat: 43.3623, lng: -8.4115 } },
];

export function useGeolocation() {
  const requestCurrentLocation = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        locationState.value.error = 'Geolocalización no soportada';
        locationState.value.permissionDenied = true;
        return reject(new Error('Geolocation unsupported'));
      }

      locationState.value.loading = true;
      locationState.value.error = null;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          locationState.value.coords = userCoords;
          locationState.value.name = 'Mi Ubicación actual';
          locationState.value.loading = false;
          locationState.value.permissionDenied = false;
          resolve(userCoords);
        },
        (err) => {
          locationState.value.loading = false;
          locationState.value.permissionDenied = true;
          locationState.value.error =
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de ubicación denegado. Selecciona una ciudad o busca manualmente.'
              : 'No se pudo obtener la ubicación precisa.';
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const setManualLocation = (name: string, coords: Coordinates) => {
    locationState.value.coords = coords;
    locationState.value.name = name;
    locationState.value.error = null;
    locationState.value.permissionDenied = false;
  };

  return {
    locationState,
    requestCurrentLocation,
    setManualLocation,
    popularLocations: POPULAR_LOCATIONS,
  };
}
