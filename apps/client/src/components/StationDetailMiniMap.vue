<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { MapPin } from 'lucide-vue-next';
import type { Station, Coordinates } from '../types';

const props = defineProps<{
  station: Station;
  userCoords: Coordinates | null;
}>();

const emit = defineEmits<{
  (e: 'open-on-map', station: Station): void;
}>();

const miniMapContainer = ref<HTMLElement | null>(null);
let miniMapInstance: any = null;
let L: any = null;

// 100% Free OpenStreetMap tile URL (NO API KEY REQUIRED)
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const initMiniMap = async () => {
  if (typeof window === 'undefined' || !miniMapContainer.value) return;

  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  const stLatLng = [props.station.latitude, props.station.longitude];

  miniMapInstance = L.map(miniMapContainer.value, {
    center: stLatLng,
    zoom: 14,
    zoomControl: false,
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    attributionControl: false, // compact display inside modal
  });

  // Standard OpenStreetMap
  L.tileLayer(OSM_TILES, {
    maxZoom: 18,
  }).addTo(miniMapInstance);

  renderMarkers();

  nextTick(() => {
    miniMapInstance?.invalidateSize();
  });
};

const renderMarkers = () => {
  if (!miniMapInstance || !L) return;

  const points: [number, number][] = [];

  // 1. Station Marker
  const tier = props.station.price_tier || 'low';
  const priceStr = props.station.selected_fuel_price
    ? props.station.selected_fuel_price.toFixed(3)
    : '---';

  const stationIcon = L.divIcon({
    className: 'pin-container',
    html: `
      <div class="airbnb-price-pin pin-${tier} pin-selected">
        <span class="price-val tabular-nums">${priceStr} €</span>
      </div>
    `,
    iconSize: [74, 28],
    iconAnchor: [37, 14],
  });

  const stCoords: [number, number] = [props.station.latitude, props.station.longitude];
  L.marker(stCoords, { icon: stationIcon, zIndexOffset: 500 }).addTo(miniMapInstance);
  points.push(stCoords);

  // 2. User Location Marker
  if (props.userCoords) {
    const userIcon = L.divIcon({
      className: 'user-pin-wrapper',
      html: '<div class="user-location-pin"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const uCoords: [number, number] = [props.userCoords.lat, props.userCoords.lng];
    L.marker(uCoords, { icon: userIcon, zIndexOffset: 1000 }).addTo(miniMapInstance);
    points.push(uCoords);
  }

  // Auto fitBounds to frame both user and station
  if (points.length >= 2) {
    const bounds = L.latLngBounds(points);
    miniMapInstance.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 16,
    });
  } else {
    miniMapInstance.setView(stCoords, 14);
  }
};

watch(
  () => props.station,
  () => {
    if (miniMapInstance) {
      miniMapInstance.eachLayer((layer: any) => {
        // Keep base tile layer
        if (layer.options && layer.options.maxZoom) return;
        layer.remove();
      });
      renderMarkers();
      nextTick(() => miniMapInstance?.invalidateSize());
    }
  }
);

onMounted(() => {
  initMiniMap();
});

onBeforeUnmount(() => {
  if (miniMapInstance) {
    miniMapInstance.remove();
    miniMapInstance = null;
  }
});
</script>

<template>
  <div
    class="mini-map-box"
    role="button"
    tabindex="0"
    title="Abrir en el mapa interactivo"
    @click="emit('open-on-map', station)"
    @keydown.enter.prevent="emit('open-on-map', station)"
  >
    <div ref="miniMapContainer" class="mini-map-element"></div>
    <div class="mini-map-badge">
      <MapPin :size="12" />
      <span>Abrir en mapa</span>
    </div>
    <div class="mini-map-legend">
      <div class="legend-item">
        <span class="user-dot"></span>
        <span>Tu posición</span>
      </div>
      <div class="legend-item">
        <span class="station-dot"></span>
        <span>Gasolinera</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.mini-map-box {
  width: 100%;
  height: 200px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    border-color: var(--border-focus);
  }

  &:active {
    transform: scale(0.99);
  }
}

.mini-map-element {
  width: 100%;
  height: 100%;
  pointer-events: none; /* Let parent container capture clicks */
}

.mini-map-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 400;
  background: var(--bg-surface);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
  pointer-events: none;
}

.mini-map-legend {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 400;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 4px 10px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  max-width: calc(100% - 16px);
  font-size: 0.7rem;
  font-weight: 600;
  box-shadow: var(--shadow-sm);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .user-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
  }

  .station-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-primary);
  }
}
</style>
