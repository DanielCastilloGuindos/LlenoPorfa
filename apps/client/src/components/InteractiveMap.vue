<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Navigation, Plus, Minus, X, ArrowRight } from 'lucide-vue-next';
import type { Station, Coordinates } from '../types';
import { useGeolocation } from '../composables/useGeolocation';
import { useStations } from '../composables/useStations';
import { useVisitDetector } from '../composables/useVisitDetector';
import { useHaptics } from '../composables/useHaptics';
import GoogleMapsIcon from './icons/GoogleMapsIcon.vue';
import WazeIcon from './icons/WazeIcon.vue';
import AppleMapsIcon from './icons/AppleMapsIcon.vue';

const props = defineProps<{
  stations: Station[];
  selectedStation: Station | null;
  hoveredStationId?: string | null;
  center?: Coordinates | null;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-station', station: Station): void;
  (e: 'open-detail', station: Station): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let mapInstance: any = null;
let L: any = null;
let tileLayer: any = null;
let markersLayer: any = null;
let userMarker: any = null;
let resizeObserver: ResizeObserver | null = null;
const markerMap = new Map<string, any>();

const { locationState, requestCurrentLocation } = useGeolocation();
const { calculateTankSavings, fuel } = useStations();
const { registerPendingVisit } = useVisitDetector();
const { light, medium } = useHaptics();

// 100% Free OpenStreetMap tile URL (NO API KEY REQUIRED EVER)
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

const initMap = async () => {
  if (typeof window === 'undefined' || !mapContainer.value) return;

  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  const defaultCenter = props.center || { lat: 40.4168, lng: -3.7038 };

  mapInstance = L.map(mapContainer.value, {
    center: [defaultCenter.lat, defaultCenter.lng],
    zoom: 13,
    zoomControl: false,
  });

  // Standard OpenStreetMap - completely free and token-free
  tileLayer = L.tileLayer(OSM_TILES, {
    attribution: ATTRIBUTION,
    maxZoom: 19,
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  mapInstance.on('click', () => {
    emit('select-station', null as any);
  });

  renderUserLocation();
  renderStationMarkers();

  // ResizeObserver for reliable rendering on mobile
  if (window.ResizeObserver && mapContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      invalidateSize();
    });
    resizeObserver.observe(mapContainer.value);
  }

  invalidateSize();
};

const invalidateSize = () => {
  if (!mapInstance) return;
  nextTick(() => {
    mapInstance.invalidateSize();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 150);
  });
};

const panToStation = (station: Station) => {
  if (!mapInstance) return;
  mapInstance.setView([station.latitude, station.longitude], 16, { animate: true });
  updateSelectedMarker(station.id);
};

defineExpose({
  invalidateSize,
  panToStation,
});

const renderUserLocation = () => {
  if (!mapInstance || !L || !locationState.value.coords) return;

  if (userMarker) {
    userMarker.remove();
  }

  const userIcon = L.divIcon({
    className: 'user-pin-wrapper',
    html: '<div class="user-location-pin"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  userMarker = L.marker([locationState.value.coords.lat, locationState.value.coords.lng], {
    icon: userIcon,
    zIndexOffset: 600,
  }).addTo(mapInstance);
};

const renderStationMarkers = () => {
  if (!mapInstance || !L || !markersLayer) return;

  markersLayer.clearLayers();
  markerMap.clear();

  if (props.stations.length === 0) return;

  const bounds = L.latLngBounds([]);

  props.stations.forEach((station) => {
    const latLng = [station.latitude, station.longitude];
    bounds.extend(latLng);

    const tier = station.price_tier || 'low';
    const isSelected = props.selectedStation?.id === station.id;
    const priceStr = station.selected_fuel_price ? station.selected_fuel_price.toFixed(3) : '---';

    const customIcon = L.divIcon({
      className: 'pin-container',
      html: `
        <div class="custom-price-pin pin-${tier} ${isSelected ? 'pin-selected' : ''}">
          <span>${priceStr} €</span>
        </div>
      `,
      iconSize: [64, 26],
      iconAnchor: [32, 13],
    });

    const marker = L.marker(latLng, { icon: customIcon }).on('click', () => {
      light();
      emit('select-station', station);
    });

    marker.addTo(markersLayer);
    markerMap.set(station.id, marker);
  });

  if (props.stations.length > 0 && !props.selectedStation) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
};

const updateSelectedMarker = (selectedId: string | null) => {
  if (!L) return;
  props.stations.forEach((station) => {
    const marker = markerMap.get(station.id);
    if (!marker) return;

    const isSel = station.id === selectedId;
    const isHov = station.id === props.hoveredStationId;
    const tier = station.price_tier || 'low';
    const priceStr = station.selected_fuel_price ? station.selected_fuel_price.toFixed(3) : '---';

    const newIcon = L.divIcon({
      className: 'pin-container',
      html: `
        <div class="custom-price-pin pin-${tier} ${isSel || isHov ? 'pin-selected' : ''}">
          <span>${priceStr} €</span>
        </div>
      `,
      iconSize: [64, 26],
      iconAnchor: [32, 13],
    });

    marker.setIcon(newIcon);

    if (isSel) {
      marker.setZIndexOffset(1000);
      mapInstance.panTo([station.latitude, station.longitude], {
        animate: true,
        duration: 0.45,
      });
    } else {
      marker.setZIndexOffset(0);
    }
  });
};

const zoomIn = () => {
  light();
  mapInstance?.zoomIn();
};

const zoomOut = () => {
  light();
  mapInstance?.zoomOut();
};

const centerOnUser = async () => {
  medium();
  if (!locationState.value.coords) {
    try {
      await requestCurrentLocation();
    } catch (e) {
      return;
    }
  }
  if (mapInstance && locationState.value.coords) {
    mapInstance.flyTo([locationState.value.coords.lat, locationState.value.coords.lng], 15, {
      duration: 1.2,
    });
  }
};

watch(() => props.stations, () => renderStationMarkers(), { deep: false });
watch(() => props.selectedStation, (newVal) => updateSelectedMarker(newVal?.id || null));
watch(() => props.hoveredStationId, (newId) => {
  if (!props.selectedStation) updateSelectedMarker(newId || null);
});
watch(() => locationState.value.coords, () => renderUserLocation());
watch(() => props.isActive, (active) => {
  if (active) invalidateSize();
});

onMounted(() => {
  initMap();
  window.addEventListener('orientationchange', invalidateSize);
  window.addEventListener('resize', invalidateSize);
});

onBeforeUnmount(() => {
  window.removeEventListener('orientationchange', invalidateSize);
  window.removeEventListener('resize', invalidateSize);
  resizeObserver?.disconnect();
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="leaflet-map-element"></div>

    <!-- Floating Map Controls (Zoom + Recenter) -->
    <div class="map-controls">
      <button class="map-ctrl-btn" @click="zoomIn" title="Acercar" aria-label="Acercar">
        <Plus :size="18" />
      </button>
      <button class="map-ctrl-btn" @click="zoomOut" title="Alejar" aria-label="Alejar">
        <Minus :size="18" />
      </button>
      <button
        class="map-ctrl-btn gps-btn"
        :class="{ active: locationState.loading }"
        @click="centerOnUser"
        title="Centrar en mi ubicación"
        aria-label="Centrar en mi ubicación"
      >
        <Navigation :size="18" />
      </button>
    </div>

    <!-- Mobile Floating Bottom Preview Card when a station is clicked on map -->
    <div
      v-if="selectedStation"
      class="mobile-bottom-station-card"
      @click="emit('open-detail', selectedStation)"
    >
      <button
        class="dismiss-btn"
        @click.stop="emit('select-station', null as any)"
        aria-label="Cerrar vista previa"
      >
        <X :size="18" />
      </button>

      <div class="station-preview-header">
        <div class="brand-block">
          <h4>{{ selectedStation.brand }}</h4>
          <p>{{ selectedStation.address }}</p>
        </div>
        <div class="price-block">
          <span class="price">
            {{ selectedStation.selected_fuel_price ? selectedStation.selected_fuel_price.toFixed(3) : '---' }}
          </span>
          <span class="unit">€/L</span>
        </div>
      </div>

      <div class="station-preview-footer">
        <div class="info-badges">
          <span v-if="selectedStation.distance_km !== null" class="badge">
            {{ selectedStation.distance_km }} km
          </span>
          <span v-if="selectedStation.is_open_24h" class="badge tag-24h">24H</span>
          <span
            v-if="calculateTankSavings(selectedStation.selected_fuel_price) > 0.5"
            class="badge savings tabular-nums"
          >
            Ahorro ~{{ calculateTankSavings(selectedStation.selected_fuel_price).toFixed(2) }} €
          </span>
        </div>

        <div class="quick-nav-actions">
          <div class="gps-direct-logos" @click.stop>
            <a
              :href="`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`"
              target="_blank"
              rel="noopener noreferrer"
              class="gps-logo-item"
              @click.stop="registerPendingVisit(selectedStation, 'google_maps', fuel)"
              title="Abrir en Google Maps"
              aria-label="Google Maps"
            >
              <GoogleMapsIcon :size="20" />
            </a>
            <a
              :href="`https://waze.com/ul?ll=${selectedStation.latitude},${selectedStation.longitude}&navigate=yes`"
              target="_blank"
              rel="noopener noreferrer"
              class="gps-logo-item"
              @click.stop="registerPendingVisit(selectedStation, 'waze', fuel)"
              title="Abrir en Waze"
              aria-label="Waze"
            >
              <WazeIcon :size="20" />
            </a>
            <a
              :href="`https://maps.apple.com/?daddr=${selectedStation.latitude},${selectedStation.longitude}&dirflg=d`"
              target="_blank"
              rel="noopener noreferrer"
              class="gps-logo-item"
              @click.stop="registerPendingVisit(selectedStation, 'apple_maps', fuel)"
              title="Abrir en Apple Maps"
              aria-label="Apple Maps"
            >
              <AppleMapsIcon :size="20" />
            </a>
          </div>

          <button class="more-btn" @click.stop="emit('open-detail', selectedStation)">
            <span>Detalle</span>
            <ArrowRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  min-height: 280px;

  @include mobile {
    height: 100%;
    min-height: calc(100dvh - var(--bottom-nav-height) - var(--safe-bottom));
  }
}

.leaflet-map-element {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

// Floating controls
.map-controls {
  position: absolute;
  top: 70px;
  right: 14px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @include desktop {
    top: 20px;
    right: 20px;
  }

  .map-ctrl-btn {
    width: 44px; // 44x44px minimum touch target
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-md);
    @include flex-center;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--bg-surface-subtle);
      transform: translateY(-1px);
    }

    &.gps-btn {
      color: var(--color-primary);
    }
  }
}

// Mobile bottom preview sheet
.mobile-bottom-station-card {
  position: absolute;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 14px);
  left: 12px;
  right: 12px;
  z-index: 500;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 0 12px rgba(16, 185, 129, 0.15);
  padding: 14px 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideUp 0.25s ease-out;

  @include desktop {
    max-width: 420px;
    left: 20px;
    right: auto;
    bottom: 24px;
  }

  .dismiss-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    color: var(--text-muted);
    min-width: 38px;
    min-height: 38px;
    @include flex-center;
    border-radius: var(--radius-full);
    &:hover {
      color: var(--text-main);
    }
  }

  .station-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-right: 32px;

    .brand-block {
      h4 {
        font-size: 1rem;
        font-weight: 800;
        color: var(--text-main);
        @include truncate;
      }
      p {
        font-size: 0.775rem;
        color: var(--text-muted);
        @include truncate;
      }
    }

    .price-block {
      display: flex;
      align-items: baseline;
      gap: 3px;
      .price {
        font-size: 1.35rem;
        font-weight: 900;
        font-family: var(--font-mono);
        color: var(--tier-low);
      }
      .unit {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
      }
    }
  }

  .station-preview-footer {
    @include flex-between;
    gap: 8px;

    .info-badges {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .badge {
        font-size: 0.725rem;
        font-weight: 600;
        padding: 4px 8px;
        background: var(--bg-surface-subtle);
        border-radius: var(--radius-sm);
        color: var(--text-muted);

        &.tag-24h {
          color: var(--tier-low);
          background: var(--tier-low-bg);
        }

        &.savings {
          color: var(--tier-low);
          background: var(--tier-low-bg);
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-weight: 700;
        }
      }
    }

    .quick-nav-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;

      .gps-direct-logos {
        display: flex;
        align-items: center;
        gap: 10px;

        .gps-logo-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          box-shadow: none;
          padding: 2px;
          line-height: 1;
          opacity: 0.92;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.2s ease,
                      filter 0.2s ease;

          &:hover {
            opacity: 1;
            transform: scale(1.22) translateY(-1px);
            filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.28));
          }

          &:active {
            transform: scale(0.92);
          }
        }
      }

      .more-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.775rem;
        font-weight: 700;
        color: var(--btn-primary-text);
        background: var(--btn-primary-bg);
        padding: 6px 14px;
        min-height: 36px;
        border-radius: var(--radius-full);
        transition: opacity var(--transition-fast);

        &:hover {
          opacity: 0.9;
        }

        &:active {
          transform: scale(0.96);
        }
      }
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
