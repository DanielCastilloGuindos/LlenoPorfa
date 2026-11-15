<script setup lang="ts">
import { computed } from 'vue';
import { Heart, Clock, Sparkles } from 'lucide-vue-next';
import type { Station } from '../types';
import { useFavorites } from '../composables/useFavorites';
import { useStations } from '../composables/useStations';
import { useVisitDetector } from '../composables/useVisitDetector';
import GoogleMapsIcon from './icons/GoogleMapsIcon.vue';
import WazeIcon from './icons/WazeIcon.vue';
import AppleMapsIcon from './icons/AppleMapsIcon.vue';

const props = defineProps<{
  station: Station;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', station: Station): void;
}>();

const { isFavorite, toggleFavorite } = useFavorites();
const { calculateTankSavings, setHoveredStation, fuel } = useStations();
const { registerPendingVisit } = useVisitDetector();

const isFav = computed(() => isFavorite(props.station.id));
const savings = computed(() => calculateTankSavings(props.station.selected_fuel_price));

const priceUnit = computed(() => {
  if (fuel.value === 'electric_kwh') return '€/kWh';
  if (fuel.value === 'hydrogen_kg') return '€/kg';
  return '€/L';
});

const tierClass = computed(() => {
  if (props.station.price_tier === 'low') return 'tier-low';
  if (props.station.price_tier === 'medium') return 'tier-medium';
  if (props.station.price_tier === 'high') return 'tier-high';
  return 'tier-low';
});

const googleMapsUrl = computed(() => {
  return `https://www.google.com/maps/dir/?api=1&destination=${props.station.latitude},${props.station.longitude}`;
});

const wazeUrl = computed(() => {
  return `https://waze.com/ul?ll=${props.station.latitude},${props.station.longitude}&navigate=yes`;
});

const appleMapsUrl = computed(() => {
  return `https://maps.apple.com/?daddr=${props.station.latitude},${props.station.longitude}&dirflg=d`;
});

const handleFavoriteClick = (e: Event) => {
  e.stopPropagation();
  toggleFavorite(props.station);
};
</script>

<template>
  <article
    class="station-card"
    :class="[tierClass, { selected: isSelected }]"
    @click="emit('select', station)"
    @mouseenter="setHoveredStation(station.id)"
    @mouseleave="setHoveredStation(null)"
  >
    <div class="card-header">
      <div class="brand-info">
        <h3 class="station-brand">{{ station.brand }}</h3>
        <p class="station-address">{{ station.address }}</p>
      </div>

      <button
        class="fav-btn"
        :class="{ active: isFav }"
        @click="handleFavoriteClick"
        :aria-label="isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'"
      >
        <Heart :size="18" :fill="isFav ? 'currentColor' : 'none'" />
      </button>
    </div>

    <div class="card-body">
      <!-- Price & Savings -->
      <div class="price-container">
        <div class="price-badge">
          <span class="price-val">
            {{ station.selected_fuel_price ? station.selected_fuel_price.toFixed(3) : '---' }}
          </span>
          <span class="price-unit">{{ priceUnit }}</span>
        </div>

        <div v-if="savings > 0.5" class="savings-tag">
          <Sparkles :size="12" />
          <span>Ahorras ~{{ savings.toFixed(2) }} €</span>
        </div>
      </div>

      <!-- Distance & Schedule -->
      <div class="meta-row">
        <span v-if="station.distance_km !== null" class="meta-item distance">
          <strong>{{ station.distance_km }}</strong> km
        </span>

        <span class="meta-item schedule" :class="{ 'is-24h': station.is_open_24h }">
          <Clock :size="12" />
          <span>{{ station.is_open_24h ? 'Abierta 24h' : station.schedule || 'Consultar horario' }}</span>
        </span>
      </div>
    </div>

    <div class="card-footer">
      <span class="municipality">{{ station.municipality }}</span>

      <!-- Direct GPS Navigation with Official Logos (Small) -->
      <div class="gps-direct-logos" @click.stop>
        <a
          :href="googleMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="gps-logo-item"
          title="Abrir en Google Maps"
          aria-label="Google Maps"
          @click="registerPendingVisit(station, 'google_maps', fuel)"
        >
          <GoogleMapsIcon :size="20" />
        </a>
        <a
          :href="wazeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="gps-logo-item"
          title="Abrir en Waze"
          aria-label="Waze"
          @click="registerPendingVisit(station, 'waze', fuel)"
        >
          <WazeIcon :size="20" />
        </a>
        <a
          :href="appleMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="gps-logo-item"
          title="Abrir en Apple Maps"
          aria-label="Apple Maps"
          @click="registerPendingVisit(station, 'apple_maps', fuel)"
        >
          <AppleMapsIcon :size="20" />
        </a>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.station-card {
  @include card-surface;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border-left-width: 4px;

  &.tier-low {
    border-left-color: var(--tier-low);
  }
  &.tier-medium {
    border-left-color: var(--tier-medium);
  }
  &.tier-high {
    border-left-color: var(--tier-high);
  }

  &.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-glow), var(--shadow-md);
  }
}

.card-header {
  @include flex-between;
  align-items: flex-start;
  gap: 12px;

  .brand-info {
    flex: 1;
    min-width: 0;

    .station-brand {
      font-size: 1rem;
      font-weight: 800;
      color: var(--text-main);
      @include truncate;
    }

    .station-address {
      font-size: 0.775rem;
      color: var(--text-muted);
      @include truncate;
      margin-top: 1px;
    }
  }

  .fav-btn {
    color: var(--text-muted);
    padding: 6px;
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    &:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    &.active {
      color: #ef4444;
    }
  }
}

.card-body {
  @include flex-between;
  align-items: flex-end;
}

.price-container {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .price-badge {
    display: flex;
    align-items: baseline;
    gap: 4px;

    .price-val {
      font-size: 1.45rem;
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1;
      font-family: var(--font-mono);

      .tier-low & {
        color: var(--tier-low);
      }
      .tier-medium & {
        color: var(--tier-medium);
      }
      .tier-high & {
        color: var(--tier-high);
      }
    }

    .price-unit {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
    }
  }

  .savings-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--tier-low-bg);
    color: var(--tier-low);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }
}

.meta-row {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;

  .meta-item {
    font-size: 0.75rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;

    &.distance {
      font-size: 0.85rem;
      color: var(--text-main);
      strong {
        font-weight: 800;
      }
    }

    &.is-24h {
      color: var(--color-primary);
      font-weight: 700;
    }
  }
}

.card-footer {
  @include flex-between;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);

  .municipality {
    font-size: 0.725rem;
    color: var(--text-muted);
    font-weight: 500;
    @include truncate;
  }

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
}
</style>
