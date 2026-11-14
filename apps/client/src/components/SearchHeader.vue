<script setup lang="ts">
import { ref } from 'vue';
import {
  Navigation,
  Search,
  MapPin,
  BookmarkPlus,
  Loader2,
  ChevronDown,
  X,
  Check,
} from 'lucide-vue-next';
import { useGeolocation } from '../composables/useGeolocation';
import { useStations } from '../composables/useStations';
import { useSavedSearches } from '../composables/useSavedSearches';

const emit = defineEmits<{
  (e: 'open-save-modal'): void;
}>();

const { locationState, requestCurrentLocation, setManualLocation, popularLocations } =
  useGeolocation();
const { localFilterText, fetchStations, fuel, radius, brand, open24h, sort } = useStations();

const showCityModal = ref(false);

const handleGpsClick = async () => {
  try {
    await requestCurrentLocation();
    await fetchStations();
  } catch (e) {
    showCityModal.value = true;
  }
};

const handleSelectCity = async (name: string, coords: { lat: number; lng: number }) => {
  setManualLocation(name, coords);
  showCityModal.value = false;
  await fetchStations();
};
</script>

<template>
  <header class="search-header">
    <div class="header-top-bar">
      <!-- Location Selector Pill -->
      <button class="location-pill" @click="showCityModal = true">
        <MapPin :size="15" class="location-icon" />
        <span class="location-name">{{ locationState.name }}</span>
        <ChevronDown :size="14" class="chevron-icon" />
      </button>

      <div class="header-actions">
        <!-- GPS locate button -->
        <button
          class="btn-icon"
          :class="{ loading: locationState.loading }"
          :disabled="locationState.loading"
          @click="handleGpsClick"
          title="Detectar mi ubicación"
          aria-label="Detectar mi ubicación"
        >
          <Loader2 v-if="locationState.loading" :size="18" class="spin" />
          <Navigation v-else :size="18" />
        </button>

        <!-- Save current search preset -->
        <button
          class="btn-icon"
          @click="emit('open-save-modal')"
          title="Guardar búsqueda"
          aria-label="Guardar búsqueda actual"
        >
          <BookmarkPlus :size="18" />
        </button>
      </div>
    </div>

    <!-- Search input for filtering by brand or street -->
    <div class="search-input-wrapper">
      <Search :size="16" class="search-icon" />
      <input
        v-model="localFilterText"
        type="search"
        placeholder="Filtrar por marca, calle o municipio..."
        class="search-input"
      />
      <button
        v-if="localFilterText"
        class="clear-btn"
        @click="localFilterText = ''"
        aria-label="Limpiar búsqueda"
      >
        <X :size="14" />
      </button>
    </div>

    <!-- City selection modal -->
    <div v-if="showCityModal" class="modal-backdrop" @click.self="showCityModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>Seleccionar Ubicación</h3>
          <button class="close-btn" @click="showCityModal = false">
            <X :size="18" />
          </button>
        </div>

        <button class="gps-option-btn" @click="handleGpsClick(); showCityModal = false">
          <Navigation :size="18" class="text-primary" />
          <div class="gps-text">
            <strong>Usar mi ubicación GPS actual</strong>
            <span>Requiere permiso de ubicación</span>
          </div>
        </button>

        <p class="section-title">Ciudades principales de España</p>

        <div class="cities-grid">
          <button
            v-for="city in popularLocations"
            :key="city.name"
            class="city-chip"
            :class="{ active: locationState.name === city.name }"
            @click="handleSelectCity(city.name, city.coords)"
          >
            <span>{{ city.name }}</span>
            <Check v-if="locationState.name === city.name" :size="14" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.search-header {
  padding: 12px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-top-bar {
  @include flex-between;
}

.location-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-subtle);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  max-width: 60%;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--border-color);
  }

  .location-icon {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .location-name {
    @include truncate;
  }

  .chevron-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  @include flex-center;
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-primary-light);
    color: var(--color-primary-dark);
  }

  &.loading {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  .search-icon {
    position: absolute;
    left: 12px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 8px 36px 8px 36px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--text-main);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-glow);
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }

  .clear-btn {
    position: absolute;
    right: 10px;
    color: var(--text-muted);
    @include flex-center;

    &:hover {
      color: var(--text-main);
    }
  }
}

// City Modal
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  @include flex-center;
  padding: 16px;
}

.modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  @include flex-between;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .close-btn {
    color: var(--text-muted);
    &:hover {
      color: var(--text-main);
    }
  }
}

.gps-option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: left;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .text-primary {
    color: var(--color-primary);
  }

  .gps-text {
    display: flex;
    flex-direction: column;

    strong {
      font-size: 0.9rem;
      color: var(--text-main);
    }

    span {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  }
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  .city-chip {
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.875rem;
    font-weight: 500;
    @include flex-between;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--border-color);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 700;
    }
  }
}
</style>
