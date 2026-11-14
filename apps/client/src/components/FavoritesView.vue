<script setup lang="ts">
import { Heart, Navigation2, Trash2 } from 'lucide-vue-next';
import { useFavorites } from '../composables/useFavorites';
import type { Station } from '../types';
import StationCard from './StationCard.vue';

const emit = defineEmits<{
  (e: 'select', station: Station): void;
}>();

const { favorites, toggleFavorite } = useFavorites();
</script>

<template>
  <div class="favorites-view">
    <div class="view-header">
      <h2>Estaciones Favoritas</h2>
      <p>Tus gasolineras habituales guardadas para comparar de un vistazo.</p>
    </div>

    <div v-if="favorites.length === 0" class="empty-state">
      <Heart :size="48" class="empty-icon" />
      <h3>No tienes gasolineras favoritas</h3>
      <p>Pulsa el icono de corazón en cualquier estación para guardarla aquí.</p>
    </div>

    <div v-else class="favorites-list">
      <StationCard
        v-for="station in favorites"
        :key="station.id"
        :station="station"
        @select="emit('select', station)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.favorites-view {
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

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
