<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { Fuel, AlertCircle, RefreshCw, WifiOff } from 'lucide-vue-next';
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

const { fetchStations, isOfflineMode } = useStations();

// Progressive pagination: render initial 20 stations, load rest progressively
const PAGE_SIZE = 20;
const visibleCount = ref(PAGE_SIZE);
const sentinelRef = ref<HTMLElement | null>(null);
const listContainer = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const visibleStations = computed(() => {
  return props.stations.slice(0, visibleCount.value);
});

const hasMore = computed(() => {
  return visibleCount.value < props.stations.length;
});

const loadMore = () => {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, props.stations.length);
  }
};

const setupObserver = () => {
  if (typeof window === 'undefined' || !window.IntersectionObserver) return;
  if (observer) observer.disconnect();

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value) {
        loadMore();
      }
    },
    { rootMargin: '200px' }
  );

  nextTick(() => {
    if (sentinelRef.value) {
      observer?.observe(sentinelRef.value);
    }
  });
};

const animateCards = () => {
  nextTick(() => {
    if (!listContainer.value) return;
    const cards = listContainer.value.querySelectorAll('.station-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          stagger: 0.03,
          ease: 'power2.out',
          force3D: true, // 60fps GPU acceleration
        }
      );
    }
  });
};

watch(
  () => props.stations,
  () => {
    visibleCount.value = PAGE_SIZE;
    animateCards();
    setupObserver();
  },
  { deep: false }
);

onMounted(() => {
  animateCards();
  setupObserver();
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
});
</script>

<template>
  <div class="station-list-wrapper">
    <!-- Offline Mode discrete notification -->
    <div v-if="isOfflineMode" class="offline-mode-badge">
      <WifiOff :size="14" />
      <span>Modo sin conexión (mostrando últimos datos guardados)</span>
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
      <p>Prueba a ampliar el radio de búsqueda o a cambiar el filtro de marca.</p>
    </div>

    <!-- Progressively rendered list of cards -->
    <div v-else ref="listContainer" class="cards-grid">
      <StationCard
        v-for="station in visibleStations"
        :key="station.id"
        :station="station"
        :is-selected="station.id === selectedStationId"
        @select="emit('select', station)"
      />

      <!-- IntersectionObserver Sentinel for progressive loading -->
      <div ref="sentinelRef" class="sentinel-loader" v-if="hasMore">
        <span class="loading-more-text">Cargando más gasolineras...</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.station-list-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  background: var(--bg-surface);
}

.offline-mode-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 16px 4px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  font-weight: 600;
  color: #d97706;

  [data-theme="dark"] & {
    color: #fbbf24;
  }
}

.cards-grid {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);
}

.sentinel-loader {
  padding: 20px 0;
  text-align: center;
  background: var(--bg-surface);
  .loading-more-text {
    font-size: 0.775rem;
    color: var(--text-muted);
    font-weight: 500;
  }
}

// Loading Skeleton
.skeleton-list {
  display: flex;
  flex-direction: column;
  background: var(--bg-surface);

  .skeleton-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-bottom: 1px solid var(--border-color);

    .skeleton-line {
      background: linear-gradient(90deg, var(--bg-surface-subtle) 25%, var(--border-color) 50%, var(--bg-surface-subtle) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);

      &.line-header {
        height: 16px;
        width: 50%;
      }
      &.line-sub {
        height: 12px;
        width: 35%;
      }
      &.line-price {
        height: 20px;
        width: 25%;
        margin-top: 6px;
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
  padding: 56px 16px;
  gap: 12px;
  color: var(--text-muted);

  .error-icon {
    color: var(--tier-high);
  }

  .empty-icon {
    color: var(--text-muted);
    opacity: 0.4;
  }

  h3 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }

  p {
    font-size: 0.825rem;
    max-width: 280px;
  }

  .retry-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 10px 18px;
    background: var(--btn-cta-bg);
    color: var(--btn-cta-text);
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.85rem;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
