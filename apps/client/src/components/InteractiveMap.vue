<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Navigation, Plus, Minus, X } from 'lucide-vue-next';
import type { Station, Coordinates } from '../types';
import { useGeolocation } from '../composables/useGeolocation';
import { useStations } from '../composables/useStations';
import { useVisitDetector } from '../composables/useVisitDetector';
import { useHaptics } from '../composables/useHaptics';

const props = defineProps<{
  stations: Station[];
  selectedStation: Station | null;
  hoveredStationId?: string | null;
  center?: Coordinates | null;
  isActive?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-station', station: Station | null): void;
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

// 100% Free OpenStreetMap tile URL (Token-free and API-key free)
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

interface ClusterGroup {
  isCluster: boolean;
  latitude: number;
  longitude: number;
  stations: Station[];
  minPrice: number | null;
  count: number;
}

const computeClusters = (stationList: Station[], zoom: number): ClusterGroup[] => {
  if (!mapInstance || zoom >= 15 || stationList.length <= 1) {
    return stationList.map((s) => ({
      isCluster: false,
      latitude: s.latitude,
      longitude: s.longitude,
      stations: [s],
      minPrice: s.selected_fuel_price,
      count: 1,
    }));
  }

  // 56px radius cluster threshold for clean Airbnb / Apple Maps density
  const clusterRadius = 56;
  const groups: ClusterGroup[] = [];
  const visited = new Set<string>();

  for (let i = 0; i < stationList.length; i++) {
    const s1 = stationList[i];
    if (visited.has(s1.id)) continue;

    // Selected station is never swallowed by a cluster
    if (props.selectedStation?.id === s1.id) {
      visited.add(s1.id);
      groups.push({
        isCluster: false,
        latitude: s1.latitude,
        longitude: s1.longitude,
        stations: [s1],
        minPrice: s1.selected_fuel_price,
        count: 1,
      });
      continue;
    }

    const p1 = mapInstance.latLngToLayerPoint([s1.latitude, s1.longitude]);
    const clusterStations: Station[] = [s1];
    visited.add(s1.id);

    for (let j = i + 1; j < stationList.length; j++) {
      const s2 = stationList[j];
      if (visited.has(s2.id) || props.selectedStation?.id === s2.id) continue;

      const p2 = mapInstance.latLngToLayerPoint([s2.latitude, s2.longitude]);
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (dist < clusterRadius) {
        clusterStations.push(s2);
        visited.add(s2.id);
      }
    }

    if (clusterStations.length === 1) {
      groups.push({
        isCluster: false,
        latitude: s1.latitude,
        longitude: s1.longitude,
        stations: [s1],
        minPrice: s1.selected_fuel_price,
        count: 1,
      });
    } else {
      const avgLat =
        clusterStations.reduce((sum, s) => sum + s.latitude, 0) / clusterStations.length;
      const avgLng =
        clusterStations.reduce((sum, s) => sum + s.longitude, 0) / clusterStations.length;
      let minP: number | null = null;
      for (const s of clusterStations) {
        if (s.selected_fuel_price !== null && (minP === null || s.selected_fuel_price < minP)) {
          minP = s.selected_fuel_price;
        }
      }

      groups.push({
        isCluster: true,
        latitude: avgLat,
        longitude: avgLng,
        stations: clusterStations,
        minPrice: minP,
        count: clusterStations.length,
      });
    }
  }

  return groups;
};

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

  tileLayer = L.tileLayer(OSM_TILES, {
    attribution: ATTRIBUTION,
    maxZoom: 19,
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  mapInstance.on('click', () => {
    emit('select-station', null);
  });

  // Re-cluster on zoom/move
  mapInstance.on('zoomend', () => {
    renderStationMarkers();
  });

  renderUserLocation();
  renderStationMarkers();

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
    mapInstance?.invalidateSize();
    setTimeout(() => {
      if (mapInstance) mapInstance.invalidateSize();
    }, 150);
  });
};

const panToStation = (station: Station) => {
  if (!mapInstance) return;
  mapInstance.setView([station.latitude, station.longitude], 16, { animate: true });
  renderStationMarkers();
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

  const currentZoom = mapInstance.getZoom();
  const clusters = computeClusters(props.stations, currentZoom);

  clusters.forEach((item) => {
    if (item.isCluster) {
      const minPriceStr = item.minPrice ? item.minPrice.toFixed(3) : '---';
      const clusterIcon = L.divIcon({
        className: 'clean-cluster-wrapper',
        html: `
          <div class="clean-cluster-pin">
            <span class="cluster-count">${item.count}</span>
            <span class="cluster-price tabular-nums">${minPriceStr} €</span>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([item.latitude, item.longitude], {
        icon: clusterIcon,
        zIndexOffset: 200,
      }).on('click', () => {
        light();
        const bounds = L.latLngBounds(item.stations.map((s) => [s.latitude, s.longitude]));
        mapInstance.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      });

      marker.addTo(markersLayer);
    } else {
      const station = item.stations[0];
      const tier = station.price_tier || 'medium';
      const isSelected = props.selectedStation?.id === station.id;
      const isHovered = props.hoveredStationId === station.id;
      const priceStr = station.selected_fuel_price ? station.selected_fuel_price.toFixed(3) : '---';

      const customIcon = L.divIcon({
        className: 'airbnb-pin-wrapper',
        html: `
          <div class="airbnb-price-pin pin-${tier} ${isSelected || isHovered ? 'pin-selected' : ''}">
            <span class="price-val tabular-nums">${priceStr} €</span>
          </div>
        `,
        iconSize: [74, 28],
        iconAnchor: [37, 14],
      });

      const marker = L.marker([station.latitude, station.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      }).on('click', (e: any) => {
        light();
        L.DomEvent.stopPropagation(e);
        emit('select-station', station);
        mapInstance.panTo([station.latitude, station.longitude], {
          animate: true,
          duration: 0.35,
        });
      });

      marker.addTo(markersLayer);
      markerMap.set(station.id, marker);
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
      duration: 1.1,
    });
  }
};

const navigationUrl = computed(() => {
  if (!props.selectedStation) return '#';
  const isApple =
    typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  if (isApple) {
    return `https://maps.apple.com/?daddr=${props.selectedStation.latitude},${props.selectedStation.longitude}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${props.selectedStation.latitude},${props.selectedStation.longitude}`;
});

const handleNavigate = () => {
  if (props.selectedStation) {
    registerPendingVisit(props.selectedStation, 'direct_nav', fuel.value);
  }
};

watch(
  () => props.stations,
  () => renderStationMarkers(),
  { deep: false }
);

watch(
  () => props.selectedStation,
  (newVal) => {
    if (newVal) {
      renderStationMarkers();
    }
  }
);

watch(
  () => props.hoveredStationId,
  () => {
    if (!props.selectedStation) renderStationMarkers();
  }
);

watch(
  () => locationState.value.coords,
  () => renderUserLocation()
);

watch(
  () => props.isActive,
  (active) => {
    if (active) invalidateSize();
  }
);

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

    <!-- Floating Map Controls (Zoom + Recenter) on the top right -->
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
        @click.stop="emit('select-station', null)"
        aria-label="Cerrar vista previa"
      >
        <X :size="16" />
      </button>

      <div class="card-main-layout">
        <div class="meta-col">
          <div class="title-row">
            <h4 class="station-brand">{{ selectedStation.brand }}</h4>
            <span
              v-if="selectedStation.distance_km !== null"
              class="station-distance tabular-nums"
            >
              {{ selectedStation.distance_km }} km
            </span>
          </div>
          <p class="station-address">{{ selectedStation.address }}</p>

          <div
            v-if="calculateTankSavings(selectedStation.selected_fuel_price) > 0.5"
            class="savings-chip tabular-nums"
          >
            <span>Ahorro ~{{ calculateTankSavings(selectedStation.selected_fuel_price).toFixed(2) }} €</span>
          </div>
        </div>

        <div class="action-col" @click.stop>
          <div class="price-box tabular-nums">
            <span class="price-val">
              {{
                selectedStation.selected_fuel_price
                  ? selectedStation.selected_fuel_price.toFixed(3)
                  : '---'
              }}
            </span>
            <span class="price-unit">€/L</span>
          </div>

          <a
            :href="navigationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="direct-go-btn"
            title="Iniciar navegación"
            aria-label="Ir a gasolinera"
            @click="handleNavigate"
          >
            <Navigation :size="15" />
            <span>Ir</span>
          </a>
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

// Floating controls on the right
.map-controls {
  position: absolute;
  top: calc(var(--safe-top) + 12px);
  right: 12px;
  z-index: 400;
  display: flex;
  flex-direction: column;
  gap: 6px;

  @include mobile {
    top: calc(var(--safe-top) + 64px);
  }

  @include desktop {
    top: 20px;
    right: 20px;
  }

  .map-ctrl-btn {
    width: 38px;
    height: 38px;
    min-width: 38px;
    min-height: 38px;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    @include flex-center;
    transition: transform var(--transition-fast), background-color var(--transition-fast);

    &:hover {
      background: var(--bg-surface-subtle);
    }

    &:active {
      transform: scale(0.95);
    }

    &.gps-btn {
      color: var(--text-main);

      &.active {
        color: var(--color-primary);
      }
    }
  }
}

// Mobile bottom preview sheet (Compact Apple Maps / Uber style)
.mobile-bottom-station-card {
  position: absolute;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 12px);
  left: 14px;
  right: 14px;
  z-index: 500;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  padding: 14px 16px;
  cursor: pointer;
  animation: slideUp 0.22s ease-out;

  @include desktop {
    max-width: 400px;
    left: 20px;
    right: auto;
    bottom: 24px;
  }

  .dismiss-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    color: var(--text-muted);
    min-width: 30px;
    min-height: 30px;
    @include flex-center;
    border-radius: var(--radius-full);
    &:hover {
      color: var(--text-main);
    }
  }

  .card-main-layout {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .meta-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;

    .title-row {
      display: flex;
      align-items: baseline;
      gap: 6px;

      .station-brand {
        font-size: 1rem;
        font-weight: 700;
        color: var(--text-main);
        @include truncate;
      }

      .station-distance {
        font-size: 0.775rem;
        font-weight: 600;
        color: var(--text-muted);
        flex-shrink: 0;
      }
    }

    .station-address {
      font-size: 0.75rem;
      color: var(--text-muted);
      @include truncate;
    }

    .savings-chip {
      margin-top: 3px;
      display: inline-flex;
      align-items: center;
      background: var(--savings-bg);
      color: var(--savings-green);
      border: 1px solid var(--savings-border);
      font-size: 0.7rem;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
      align-self: flex-start;
    }
  }

  .action-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;

    .price-box {
      display: flex;
      align-items: baseline;
      gap: 2px;

      .price-val {
        font-size: 1.35rem;
        font-weight: 800;
        color: var(--text-main);
        letter-spacing: -0.02em;
        line-height: 1;
      }

      .price-unit {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-muted);
      }
    }

    .direct-go-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 6px 16px;
      border-radius: var(--radius-full);
      background: var(--btn-primary-bg);
      color: var(--btn-primary-text);
      font-weight: 700;
      font-size: 0.825rem;
      min-height: 34px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
