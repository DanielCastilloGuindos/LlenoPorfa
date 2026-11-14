<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import type { Station, Coordinates } from '../types';

const props = defineProps<{
  station: Station;
  userCoords: Coordinates | null;
}>();

const miniMapContainer = ref<HTMLElement | null>(null);
let miniMapInstance: any = null;
let L: any = null;
let currentTileLayer: any = null;
let themeObserver: MutationObserver | null = null;

const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const OSM_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';

const isCurrentThemeDark = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
};

const updateTileTheme = () => {
  if (!miniMapInstance || !L) return;
  const isDark = isCurrentThemeDark();
  const targetUrl = isDark ? DARK_TILES : LIGHT_TILES;

  if (currentTileLayer) {
    currentTileLayer.remove();
  }

  currentTileLayer = L.tileLayer(targetUrl, {
    attribution: ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 18,
  });

  currentTileLayer.on('tileerror', () => {
    if (miniMapInstance && currentTileLayer) {
      currentTileLayer.setUrl(OSM_FALLBACK);
    }
  });

  currentTileLayer.addTo(miniMapInstance);
};

const initMiniMap = async () => {
  if (typeof window === 'undefined' || !miniMapContainer.value) return;

  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  const stLatLng = [props.station.latitude, props.station.longitude];

  miniMapInstance = L.map(miniMapContainer.value, {
    center: stLatLng,
    zoom: 14,
    zoomControl: false,
    dragging: true,
    scrollWheelZoom: false,
    attributionControl: false, // compact display inside modal
  });

  updateTileTheme();
  renderMarkers();

  // Watch html theme changes
  themeObserver = new MutationObserver(() => updateTileTheme());
  themeObserver.observe(document.documentElement, { attributes: true });

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
      <div class="custom-price-pin pin-${tier} pin-selected">
        <span>${priceStr} €</span>
      </div>
    `,
    iconSize: [64, 26],
    iconAnchor: [32, 13],
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
        if (layer !== currentTileLayer) layer.remove();
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
  themeObserver?.disconnect();
  if (miniMapInstance) {
    miniMapInstance.remove();
    miniMapInstance = null;
  }
});
</script>

<template>
  <div class="mini-map-box">
    <div ref="miniMapContainer" class="mini-map-element"></div>
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
}

.mini-map-element {
  width: 100%;
  height: 100%;
}

.mini-map-legend {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 400;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  padding: 4px 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  box-shadow: var(--shadow-sm);

  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
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
