<script setup lang="ts">
import { ref } from 'vue';
import { BookmarkCheck, Trash2, ArrowRight, Plus, MapPin, Fuel } from 'lucide-vue-next';
import { useSavedSearches } from '../composables/useSavedSearches';
import { useStations } from '../composables/useStations';
import { useGeolocation } from '../composables/useGeolocation';
import type { SavedSearch } from '../types';

const emit = defineEmits<{
  (e: 'applied'): void;
}>();

const { savedSearches, removeSavedSearch } = useSavedSearches();
const { fuel, radius, brand, open24h, sort, fetchStations } = useStations();
const { setManualLocation } = useGeolocation();

const applySearch = async (preset: SavedSearch) => {
  fuel.value = preset.fuel;
  radius.value = preset.radius;
  sort.value = preset.sort;
  brand.value = preset.brand || 'all';
  open24h.value = preset.open24h;

  if (preset.lat !== null && preset.lng !== null) {
    setManualLocation(preset.locationName, { lat: preset.lat, lng: preset.lng });
  }

  await fetchStations();
  emit('applied');
};
</script>

<template>
  <div class="saved-searches-view">
    <div class="view-header">
      <h2>Búsquedas Guardadas</h2>
      <p>Presets rápidos para reaplicar tus filtros favoritos con un solo toque.</p>
    </div>

    <!-- Empty state -->
    <div v-if="savedSearches.length === 0" class="empty-state">
      <BookmarkCheck :size="48" class="empty-icon" />
      <h3>No tienes búsquedas guardadas</h3>
      <p>Guarda una búsqueda desde la barra superior de la pestaña Buscar.</p>
    </div>

    <!-- Presets list -->
    <div v-else class="presets-list">
      <div
        v-for="preset in savedSearches"
        :key="preset.id"
        class="preset-card"
        @click="applySearch(preset)"
      >
        <div class="preset-info">
          <h3 class="preset-title">{{ preset.title }}</h3>
          <div class="preset-tags">
            <span class="tag">
              <Fuel :size="12" />
              <span>{{ preset.fuel.toUpperCase() }}</span>
            </span>
            <span class="tag">
              <MapPin :size="12" />
              <span>{{ preset.locationName }} ({{ preset.radius }}km)</span>
            </span>
          </div>
        </div>

        <div class="preset-actions">
          <button
            class="delete-btn"
            @click.stop="removeSavedSearch(preset.id)"
            aria-label="Eliminar búsqueda guardada"
          >
            <Trash2 :size="16" />
          </button>
          <div class="apply-icon">
            <ArrowRight :size="18" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.saved-searches-view {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.view-header {
  h2 {
    font-size: 1.35rem;
    font-weight: 800;
  }
  p {
    font-size: 0.85rem;
    color: var(--text-muted);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 16px;
  text-align: center;
  gap: 10px;
  color: var(--text-muted);

  .empty-icon {
    opacity: 0.4;
  }

  h3 {
    color: var(--text-main);
  }

  p {
    font-size: 0.85rem;
    max-width: 280px;
  }
}

.presets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-card {
  @include card-surface;
  padding: 14px 16px;
  @include flex-between;
  cursor: pointer;

  .preset-info {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .preset-title {
      font-size: 0.975rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .preset-tags {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--bg-surface-subtle);
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.725rem;
        color: var(--text-muted);
        font-weight: 600;
      }
    }
  }

  .preset-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .delete-btn {
      color: var(--text-muted);
      padding: 8px;
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);

      &:hover {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
      }
    }

    .apply-icon {
      color: var(--color-primary);
      padding: 6px;
    }
  }
}
</style>
