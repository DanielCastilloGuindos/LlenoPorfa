import { ref, onMounted } from 'vue';
import type { Station } from '../types';

const STORAGE_KEY = 'llenoporfa_favorites_v1';

const favorites = ref<Station[]>([]);

export function useFavorites() {
  const loadFavorites = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        favorites.value = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse favorites from localStorage', e);
    }
  };

  const persist = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
    }
  };

  const isFavorite = (stationId: string): boolean => {
    return favorites.value.some((s) => s.id === stationId);
  };

  const toggleFavorite = (station: Station) => {
    const idx = favorites.value.findIndex((s) => s.id === station.id);
    if (idx >= 0) {
      favorites.value.splice(idx, 1);
    } else {
      favorites.value.unshift(station);
    }
    persist();
  };

  onMounted(() => {
    loadFavorites();
  });

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  };
}
