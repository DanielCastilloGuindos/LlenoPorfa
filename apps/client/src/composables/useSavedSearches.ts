import { ref, onMounted } from 'vue';
import type { SavedSearch, FuelId, SortMode } from '../types';

const STORAGE_KEY = 'llenoporfa_saved_searches_v1';

const savedSearches = ref<SavedSearch[]>([]);

export function useSavedSearches() {
  const loadSavedSearches = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        savedSearches.value = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse saved searches', e);
    }
  };

  const persist = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSearches.value));
    }
  };

  const addSavedSearch = (search: Omit<SavedSearch, 'id' | 'createdAt'>) => {
    const item: SavedSearch = {
      ...search,
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    savedSearches.value.unshift(item);
    persist();
    return item;
  };

  const removeSavedSearch = (id: string) => {
    savedSearches.value = savedSearches.value.filter((s) => s.id !== id);
    persist();
  };

  onMounted(() => {
    loadSavedSearches();
  });

  return {
    savedSearches,
    addSavedSearch,
    removeSavedSearch,
  };
}
