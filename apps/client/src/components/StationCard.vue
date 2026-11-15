<script setup lang="ts">
import { computed } from 'vue';
import { Heart, Clock } from 'lucide-vue-next';
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
    <div class="card-top">
      <div class="brand-info">
        <h3 class="station-brand">{{ station.brand }}</h3>
        <p class="station-address">{{ station.address }}</p>
      </div>

      <!-- Price & Savings -->
      <div class="price-container">
        <div class="price-badge tabular-nums">
          <span class="price-val">
            {{ station.selected_fuel_price ? station.selected_fuel_price.toFixed(3) : '---' }}
          </span>
          <span class="price-unit">{{ priceUnit }}</span>
        </div>

        <div v-if="savings > 0.5" class="savings-tag tabular-nums">
          <span>Ahorras ~{{ savings.toFixed(2) }} €</span>
        </div>
      </div>
    </div>

    <div class="card-bottom">
      <div class="meta-row">
        <span v-if="station.distance_km !== null" class="meta-item distance tabular-nums">
          {{ station.distance_km }} km
        </span>
        <span class="meta-divider" v-if="station.distance_km !== null">·</span>
        <span class="meta-item schedule" :class="{ 'is-24h': station.is_open_24h }">
          <Clock :size="12" />
          <span>{{ station.is_open_24h ? 'Abierta 24h' : station.schedule || 'Consultar horario' }}</span>
        </span>
      </div>

      <div class="card-actions" @click.stop>
        <button
          class="fav-btn"
          :class="{ active: isFav }"
          @click="handleFavoriteClick"
          :aria-label="isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'"
        >
          <Heart :size="16" :fill="isFav ? 'currentColor' : 'none'" />
        </button>

        <div class="gps-direct-logos">
          <a
            :href="googleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="gps-logo-item"
            title="Abrir en Google Maps"
            aria-label="Google Maps"
            @click="registerPendingVisit(station, 'google_maps', fuel)"
          >
            <GoogleMapsIcon :size="18" />
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
            <WazeIcon :size="18" />
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
            <AppleMapsIcon :size="18" />
          </a>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.station-card {
  background: var(--bg-surface);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  position: relative;
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-fast);

  &:hover {
    background: var(--bg-surface-subtle);
  }

  &.selected {
    background: var(--bg-surface-subtle);
  }
}

.card-top {
  @include flex-between;
  align-items: flex-start;
  gap: 12px;

  .brand-info {
    flex: 1;
    min-width: 0;

    .station-brand {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      @include truncate;
    }

    .station-address {
      font-size: 0.775rem;
      color: var(--text-muted);
      @include truncate;
      margin-top: 2px;
    }
  }
}

.price-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;

  .price-badge {
    display: flex;
    align-items: baseline;
    gap: 3px;

    .price-val {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
      color: var(--text-main);
      font-variant-numeric: tabular-nums;

      .tier-low & {
        color: var(--savings-green);
      }
    }

    .price-unit {
      font-size: 0.725rem;
      font-weight: 600;
      color: var(--text-muted);
    }
  }

  .savings-tag {
    display: inline-flex;
    align-items: center;
    background: var(--savings-bg);
    color: var(--savings-green);
    border: 1px solid var(--savings-border);
    font-size: 0.7rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    font-variant-numeric: tabular-nums;
  }
}

.card-bottom {
  @include flex-between;
  align-items: center;
  gap: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
  min-width: 0;

  .distance {
    font-weight: 600;
    color: var(--text-main);
    font-variant-numeric: tabular-nums;
  }

  .meta-divider {
    color: var(--border-color);
  }

  .schedule {
    display: flex;
    align-items: center;
    gap: 4px;
    @include truncate;

    &.is-24h {
      color: var(--savings-green);
      font-weight: 600;
    }
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .fav-btn {
    color: var(--text-muted);
    padding: 6px;
    min-width: 32px;
    min-height: 32px;
    border-radius: var(--radius-full);
    transition: color var(--transition-fast);

    &:hover {
      color: #ef4444;
    }

    &.active {
      color: #ef4444;
    }
  }

  .gps-direct-logos {
    display: flex;
    align-items: center;
    gap: 8px;

    .gps-logo-item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      line-height: 1;
      opacity: 0.85;
      transition: transform var(--transition-fast), opacity var(--transition-fast);

      &:hover {
        opacity: 1;
        transform: scale(1.15);
      }
    }
  }
}
</style>
