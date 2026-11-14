import { ref, watch, onMounted } from 'vue';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { BackgroundGeolocationPlugin, Location } from '@capacitor-community/background-geolocation';
import { useSettings } from './useSettings';
import { useRefuelLogs } from './useRefuelLogs';
import { useTelemetry } from './useTelemetry';
import { apiUrl } from '../utils/apiBase';
import type { Station, FuelId } from '../types';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const RADAR_DEAL_COOLDOWN_PREFIX = 'llenoporfa_deal_notified_';
const RADAR_ARRIVAL_COOLDOWN_PREFIX = 'llenoporfa_radar_arrival_';
const RADAR_DWELL_PREFIX = 'llenoporfa_dwell_';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const TWO_MINUTES_MS = 2 * 60 * 1000;

const isRadarRunning = ref(false);
const radarError = ref<string | null>(null);
let activeWatcherId: string | null = null;
let isListenerRegistered = false;

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useNativeRadar() {
  const { settings } = useSettings();
  const { setPrefillFromStation } = useRefuelLogs();
  const { trackEvent } = useTelemetry();

  const isNative = Capacitor.isNativePlatform();

  const setupNotificationListeners = async () => {
    if (!isNative || isListenerRegistered) return;
    isListenerRegistered = true;

    try {
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notificationAction) => {
          const extra = notificationAction.notification.extra;
          if (extra && extra.type === 'arrival_prompt') {
            setPrefillFromStation(
              {
                id: extra.stationId,
                brand: extra.stationName,
                address: extra.address,
                selected_fuel_price: extra.price ?? null,
              } as any,
              extra.fuel || 'g95_e5'
            );

            // Notify app to switch tab
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'refuel');
              window.history.pushState({}, '', url.toString());
              window.dispatchEvent(
                new CustomEvent('llenoporfa:navigate-tab', { detail: 'refuel' })
              );
            }
          }
        }
      );
    } catch (e) {
      console.warn('Error setting up notification listeners:', e);
    }
  };

  const processLocationUpdate = async (latitude: number, longitude: number) => {
    try {
      const preferredFuel: FuelId = settings.value.defaultFuel || 'g95_e5';

      // Query nearby stations via centralized API route
      const url = apiUrl(
        `/api/stations?lat=${latitude}&lng=${longitude}&radius=2&fuel=${preferredFuel}&sort=price`
      );
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();
      const stations: Station[] = data.stations || [];
      const avgPrice = data.stats?.avgPrice || null;

      const now = Date.now();

      for (const station of stations) {
        const dist = haversineDistanceMeters(
          latitude,
          longitude,
          station.latitude,
          station.longitude
        );

        const stationPrice = station.selected_fuel_price;

        // --- TYPE 1: Alerta de chollo en ruta (< 800m, >= 0.08 €/L más barato que la media) ---
        if (dist <= 800 && stationPrice && avgPrice && avgPrice - stationPrice >= 0.08) {
          const dealKey = `${RADAR_DEAL_COOLDOWN_PREFIX}${station.id}`;
          const lastDeal = Number(localStorage.getItem(dealKey) || '0');

          if (now - lastDeal >= SIX_HOURS_MS) {
            localStorage.setItem(dealKey, String(now));

            const fuelNames: Record<FuelId, string> = {
              g95_e5: 'Gasolina 95',
              diesel_a: 'Diésel',
              g98_e5: 'Gasolina 98',
              diesel_premium: 'Diésel Premium',
              glp: 'GLP',
            };
            const fuelName = fuelNames[preferredFuel] || 'Carburante';
            const diff = (avgPrice - stationPrice).toFixed(2);

            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Math.random() * 1000000),
                  title: `🔥 ${fuelName} barata a ${Math.round(dist)}m`,
                  body: `${station.brand}: ${stationPrice.toFixed(3)} €/L (${diff} €/L bajo la media)`,
                  extra: {
                    type: 'deal_alert',
                    stationId: station.id,
                  },
                },
              ],
            });

            trackEvent('radar_deal_notified', {
              station_id: station.id,
              station_brand: station.brand,
              fuel_type: preferredFuel,
              price: stationPrice,
              avg_price: avgPrice,
              distance_meters: dist,
            });
          }
        }

        // --- TYPE 2: Detector de llegada al surtidor (< 100m durante > 2 min o tras 'Cómo llegar') ---
        if (dist <= 100) {
          const dwellKey = `${RADAR_DWELL_PREFIX}${station.id}`;
          const firstSeen = Number(sessionStorage.getItem(dwellKey) || '0');

          if (!firstSeen) {
            sessionStorage.setItem(dwellKey, String(now));
          } else if (now - firstSeen >= TWO_MINUTES_MS) {
            // Check arrival notification cooldown (4 hours)
            const arrivalKey = `${RADAR_ARRIVAL_COOLDOWN_PREFIX}${station.id}`;
            const lastArrival = Number(localStorage.getItem(arrivalKey) || '0');

            if (now - lastArrival >= FOUR_HOURS_MS) {
              localStorage.setItem(arrivalKey, String(now));
              sessionStorage.removeItem(dwellKey);

              // Register telemetry visit event
              trackEvent('station_arrival_detected', {
                station_id: station.id,
                station_brand: station.brand,
                fuel_type: preferredFuel,
                price: stationPrice,
                distance_meters: dist,
                source: 'native_radar',
              });

              // Fire local notification
              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: Math.floor(Math.random() * 1000000),
                    title: `¿Has repostado en ${station.brand}?`,
                    body: 'Toca aquí para guardar el ticket y controlar tu ahorro.',
                    extra: {
                      type: 'arrival_prompt',
                      stationId: station.id,
                      stationName: station.brand,
                      address: station.address,
                      price: stationPrice,
                      fuel: preferredFuel,
                    },
                  },
                ],
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('Radar location update processing error:', e);
    }
  };

  const startRadar = async () => {
    if (!isNative) {
      radarError.value = 'El radar en segundo plano solo está disponible en la app nativa.';
      return;
    }

    if (activeWatcherId) return;

    try {
      // 1. Check and request notification permissions
      const notifPerm = await LocalNotifications.checkPermissions();
      if (notifPerm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') {
          radarError.value = 'Permiso de notificaciones denegado.';
          return;
        }
      }

      await setupNotificationListeners();

      // 2. Add Background Geolocation Watcher (distanceFilter: 400m for battery efficiency)
      activeWatcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: 'Radar llenoPorfa activo',
          backgroundMessage: 'Buscando las mejores ofertas de carburante en tu ruta...',
          requestPermissions: true,
          stale: false,
          distanceFilter: 400,
        },
        (location?: Location, error?: any) => {
          if (error) {
            console.warn('Native background geolocation error:', error);
            return;
          }
          if (location) {
            processLocationUpdate(location.latitude, location.longitude);
          }
        }
      );

      isRadarRunning.value = true;
      radarError.value = null;
    } catch (e: any) {
      console.error('Failed to start native radar:', e);
      radarError.value = e.message || 'Error al iniciar el radar en segundo plano.';
      isRadarRunning.value = false;
    }
  };

  const stopRadar = async () => {
    if (!activeWatcherId) return;

    try {
      await BackgroundGeolocation.removeWatcher({ id: activeWatcherId });
      activeWatcherId = null;
      isRadarRunning.value = false;
    } catch (e) {
      console.warn('Failed to remove watcher:', e);
    }
  };

  const toggleRadar = async (enabled: boolean) => {
    if (enabled) {
      await startRadar();
    } else {
      await stopRadar();
    }
  };

  watch(
    () => settings.value.nativeBackgroundRadar,
    (enabled) => {
      if (isNative) {
        toggleRadar(!!enabled);
      }
    }
  );

  onMounted(() => {
    if (isNative && settings.value.nativeBackgroundRadar) {
      startRadar();
    }
  });

  return {
    isNative,
    isRadarRunning,
    radarError,
    startRadar,
    stopRadar,
    toggleRadar,
  };
}
