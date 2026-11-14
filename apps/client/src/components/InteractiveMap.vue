<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { Station, Coordinates } from '../types';
import { useStations } from '../composables/useStations';
import { useGeolocation } from '../composables/useGeolocation';

const props = defineProps<{
  stations: Station[];
  selectedStation: Station | null;
  hoveredStationId?: string | null;
  center?: Coordinates | null;
}>();

const emit = defineEmits<{
  (e: 'select-station', station: Station): void;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let mapInstance: any = null;
let L: any = null;
let markersLayer: any = null;
let userMarker: any = null;
const markerMap = new Map<string, any>();

const { locationState } = useGeolocation();

const initMap = async () => {
  if (typeof window === 'undefined' || !mapContainer.value) return;

  // Dynamically import Leaflet so it never executes during SSR
  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');

  const defaultCenter = props.center || { lat: 40.4168, lng: -3.7038 };

  mapInstance = L.map(mapContainer.value, {
    center: [defaultCenter.lat, defaultCenter.lng],
    zoom: 13,
    zoomControl: false,
  });

  // Zoom control in top right
  L.control.zoom({ position: 'topright' }).addTo(mapInstance);

  // Free OpenStreetMap CartoDB Positron / OSM tiles for crisp mobile look
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapInstance);

  markersLayer = L.layerGroup().addTo(mapInstance);

  renderUserLocation();
  renderStationMarkers();
};

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
    zIndexOffset: 500,
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
      emit('select-station', station);
    });

    marker.addTo(markersLayer);
    markerMap.set(station.id, marker);
  });

  // Fit bounds if stations are present
  if (props.stations.length > 0 && !props.selectedStation) {
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
};

// Update active marker styling
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
        duration: 0.5,
      });
    } else {
      marker.setZIndexOffset(0);
    }
  });
};

watch(
  () => props.stations,
  () => {
    renderStationMarkers();
  },
  { deep: false }
);

watch(
  () => props.selectedStation,
  (newVal) => {
    updateSelectedMarker(newVal?.id || null);
  }
);

watch(
  () => props.hoveredStationId,
  (newId) => {
    if (!props.selectedStation) {
      updateSelectedMarker(newId || null);
    }
  }
);

watch(
  () => locationState.value.coords,
  () => {
    renderUserLocation();
  }
);

onMounted(() => {
  initMap();
});

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
});
</script>

<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="leaflet-map-element"></div>
  </div>
</template>

<style scoped lang="scss">
.map-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.leaflet-map-element {
  width: 100%;
  height: 100%;
}
</style>
