import { ref } from 'vue';
import type { Coordinates } from '../types';

export interface LocationState {
  coords: Coordinates | null;
  name: string;
  loading: boolean;
  prompting: boolean;
  error: string | null;
  permissionDenied: boolean;
}

const locationState = ref<LocationState>({
  coords: { lat: 40.4168, lng: -3.7038 }, // Default: Madrid center fallback
  name: 'Madrid Centro',
  loading: false,
  prompting: false,
  error: null,
  permissionDenied: false,
});

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
        locationState.value.error = 'Tu dispositivo o navegador no soporta geolocalización.';
        locationState.value.permissionDenied = true;
        locationState.value.loading = false;
        locationState.value.prompting = false;
        return reject(new Error('Geolocation unsupported'));
      }

      locationState.value.loading = true;
      locationState.value.prompting = true;
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
          locationState.value.prompting = false;
          locationState.value.permissionDenied = false;
          locationState.value.error = null;
          resolve(userCoords);
        },
        (err) => {
          locationState.value.loading = false;
          locationState.value.prompting = false;
          locationState.value.permissionDenied = true;
          locationState.value.error =
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de ubicación no concedido. Podés buscar manualmente por ciudad o código postal.'
              : 'No pudimos obtener tu ubicación con precisión. Usando zona por defecto.';
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
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

  const dismissError = () => {
    locationState.value.error = null;
  };

  return {
    locationState,
    requestCurrentLocation,
    setManualLocation,
    dismissError,
    popularLocations: POPULAR_LOCATIONS,
  };
}
