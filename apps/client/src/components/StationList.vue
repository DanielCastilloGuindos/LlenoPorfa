<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { Fuel, AlertCircle, RefreshCw } from 'lucide-vue-next';
import type { Station } from '../types';
import StationCard from './StationCard.vue';
import { useStations } from '../composables/useStations';
import gsap from 'gsap';

const props = defineProps<{
  stations: Station[];
  loading: boolean;
  error: string | null;
  selectedStationId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'select', station: Station): void;
}>();

const { stats, fetchStations } = useStations();
const listContainer = ref<HTMLElement | null>(null);

const animateCards = () => {
  nextTick(() => {
    if (!listContainer.value) return;
    const cards = listContainer.value.querySelectorAll('.station-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 15 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.04,
          ease: 'power2.out',
        }
      );
    }
  });
};

watch(
  () => props.stations,
  () => {
    animateCards();
  },
  { deep: false }
);

onMounted(() => {
  animateCards();
});
</script>

<template>
  <div class="station-list-wrapper">
    <!-- Area Statistics Summary Pill -->
    <div v-if="!loading && stats.count > 0" class="stats-banner">
      <div class="stat-pill">
        <span class="stat-label">Gasolineras:</span>
        <strong class="stat-val">{{ stats.count }}</strong>
      </div>

      <div v-if="stats.minPrice" class="stat-pill highlight">
        <span class="stat-label">Mínimo:</span>
        <strong class="stat-val text-green">{{ stats.minPrice.toFixed(3) }} €</strong>
      </div>

      <div v-if="stats.avgPrice" class="stat-pill">
        <span class="stat-label">Media zona:</span>
        <strong class="stat-val">{{ stats.avgPrice.toFixed(3) }} €</strong>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-container">
      <AlertCircle :size="32" class="error-icon" />
      <p class="error-text">{{ error }}</p>
      <button class="retry-btn" @click="fetchStations">
        <RefreshCw :size="16" />
        <span>Reintentar</span>
      </button>
    </div>

    <!-- Loading Skeleton -->
    <div v-else-if="loading" class="skeleton-list">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="skeleton-line line-header"></div>
        <div class="skeleton-line line-sub"></div>
        <div class="skeleton-line line-price"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="stations.length === 0" class="empty-container">
      <Fuel :size="48" class="empty-icon" />
      <h3>No hay resultados en esta zona</h3>
      <p>Prueba a ampliar el radio de búsqueda o desactivar algún filtro.</p>
    </div>

    <!-- List of cards -->
    <div v-else ref="listContainer" class="cards-grid">
      <StationCard
        v-for="station in stations"
        :key="station.id"
        :station="station"
        :is-selected="station.id === selectedStationId"
        @select="emit('select', station)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.station-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  min-height: 200px;
}

.stats-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;

  .stat-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-full);
    font-size: 0.725rem;
    white-space: nowrap;

    .stat-label {
      color: var(--text-muted);
    }

    .stat-val {
      font-weight: 700;
      color: var(--text-main);

      &.text-green {
        color: var(--tier-low);
      }
    }

    &.highlight {
      background: var(--tier-low-bg);
      border-color: rgba(16, 185, 129, 0.3);
    }
  }
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// Loading Skeleton
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .skeleton-card {
    @include card-surface;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    .skeleton-line {
      background: linear-gradient(90deg, var(--bg-surface-subtle) 25%, var(--border-color) 50%, var(--bg-surface-subtle) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);

      &.line-header {
        height: 18px;
        width: 60%;
      }
      &.line-sub {
        height: 12px;
        width: 40%;
      }
      &.line-price {
        height: 24px;
        width: 30%;
        margin-top: 8px;
      }
    }
  }
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// Error & Empty
.error-container, .empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 16px;
  gap: 12px;
  color: var(--text-muted);

  .error-icon {
    color: #ef4444;
  }

  .empty-icon {
    color: var(--text-muted);
    opacity: 0.5;
  }

  h3 {
    font-size: 1.1rem;
    color: var(--text-main);
  }

  p {
    font-size: 0.85rem;
    max-width: 300px;
  }

  .retry-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 8px 16px;
    background: var(--color-primary);
    color: #ffffff;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.85rem;
  }
}
</style>
