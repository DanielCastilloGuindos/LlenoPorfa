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
  TrendingUp,
  TrendingDown,
  Minus,
  Cylinder,
} from 'lucide-vue-next';
import { useGeolocation } from '../composables/useGeolocation';
import { useStations } from '../composables/useStations';
import { useMarket } from '../composables/useMarket';
import { useHaptics } from '../composables/useHaptics';

const props = withDefaults(
  defineProps<{
    onlySearch?: boolean;
  }>(),
  {
    onlySearch: false,
  }
);

const emit = defineEmits<{
  (e: 'open-save-modal'): void;
}>();

const { locationState, requestCurrentLocation, setManualLocation, popularLocations } =
  useGeolocation();
const { localFilterText, fetchStations } = useStations();
const { marketData, crudePriceFormatted, delta7dFormatted, openBarometer } = useMarket();
const { light, medium, success } = useHaptics();

const showCityModal = ref(false);

const handleGpsClick = async () => {
  medium();
  try {
    await requestCurrentLocation();
    await fetchStations();
    success();
  } catch (e) {
    showCityModal.value = true;
  }
};

const handleSelectCity = async (name: string, coords: { lat: number; lng: number }) => {
  light();
  setManualLocation(name, coords);
  showCityModal.value = false;
  await fetchStations();
};

const openSaveModal = () => {
  light();
  emit('open-save-modal');
};
</script>

<template>
  <header class="search-header" :class="{ 'search-only': props.onlySearch }">
    <div v-if="!props.onlySearch" class="header-top-bar">
      <!-- Location Selector Pill -->
      <button class="location-pill" @click="showCityModal = true; light()">
        <MapPin :size="15" class="location-icon" />
        <span class="location-name">{{ locationState.name }}</span>
        <ChevronDown :size="13" class="chevron-icon" />
      </button>

      <!-- Crude Barometer Quick Indicator Pill -->
      <button
        class="crude-pill"
        @click="openBarometer(); light()"
        title="Abrir Barómetro del Crudo e Impuestos"
        aria-label="Abrir Barómetro del Crudo e Impuestos"
      >
        <Cylinder :size="14" class="crude-icon" />
        <span class="crude-text"><span class="crude-label-text">Crudo: </span><strong>{{ crudePriceFormatted }}€</strong></span>
        <span class="crude-trend" :class="marketData.trend">
          <TrendingUp v-if="marketData.trend === 'rising'" :size="11" />
          <TrendingDown v-else-if="marketData.trend === 'falling'" :size="11" />
          <Minus v-else :size="11" />
          <span>{{ delta7dFormatted }}</span>
        </span>
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
          @click="openSaveModal"
          title="Guardar búsqueda"
          aria-label="Guardar búsqueda actual"
        >
          <BookmarkPlus :size="18" />
        </button>
      </div>
    </div>

    <!-- Search input for filtering by brand or street -->
    <div class="search-input-wrapper">
      <Search :size="18" class="search-icon" />
      <input
        v-model="localFilterText"
        type="search"
        placeholder="Filtrar por marca, calle o municipio..."
        class="search-input"
      />
      <button
        v-if="localFilterText"
        class="clear-btn"
        @click="localFilterText = ''; light()"
        aria-label="Limpiar búsqueda"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- City selection modal -->
    <div v-if="!props.onlySearch && showCityModal" class="modal-backdrop" @click.self="showCityModal = false">
      <div class="modal-card">
        <div class="bottom-sheet-handle"></div>

        <div class="modal-header">
          <h3>Seleccionar Ubicación</h3>
          <button class="close-btn" @click="showCityModal = false">
            <X :size="18" />
          </button>
        </div>

        <button class="gps-option-btn" @click="handleGpsClick(); showCityModal = false">
          <Navigation :size="20" class="text-primary" />
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
  padding: 12px 16px 10px;
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  gap: 10px;

  &.search-only {
    padding: 0;
    background: transparent;
    gap: 0;
  }
}

.header-top-bar {
  @include flex-between;
  gap: 8px;
}

.location-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-subtle);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  max-width: 50%;
  min-height: 38px;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);

  &:hover {
    background: var(--border-color);
  }

  .location-icon {
    color: var(--text-muted);
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

.crude-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-subtle);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 0.775rem;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  min-height: 38px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);

  &:hover {
    border-color: var(--border-focus);
  }

  .crude-icon {
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .crude-text {
    font-weight: 500;
    color: var(--text-muted);

    strong {
      color: var(--text-main);
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
  }

  .crude-trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.725rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;

    &.rising {
      color: var(--tier-high);
    }
    &.falling {
      color: var(--savings-green);
    }
    &.stable {
      color: var(--text-muted);
    }
  }

  @media (max-width: 480px) {
    padding: 6px 9px;
    gap: 4px;
    font-size: 0.725rem;

    .crude-label-text {
      display: none;
    }
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.btn-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  min-height: 38px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  @include flex-center;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);

  &:hover {
    background: var(--border-color);
    color: var(--text-main);
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
    padding: 10px 40px 10px 38px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    color: var(--text-main);
    min-height: 42px;
    transition: border-color var(--transition-fast);

    &:focus {
      border-color: var(--border-focus);
    }

    &::placeholder {
      color: var(--text-muted);
    }
  }

  .clear-btn {
    position: absolute;
    right: 6px;
    color: var(--text-muted);
    min-width: 36px;
    min-height: 36px;
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
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 200;
  @include flex-center;
  padding: 16px;

  @include mobile {
    align-items: flex-end;
    padding: 0;
  }
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

  .bottom-sheet-handle {
    @include desktop {
      display: none;
    }
  }

  @include mobile {
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    border-bottom: none;
    max-height: 85dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 10px 20px calc(var(--bottom-nav-height) + var(--safe-bottom) + 24px);
  }
}

.modal-header {
  @include flex-between;

  h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .close-btn {
    color: var(--text-muted);
    min-width: 36px;
    min-height: 36px;
    &:hover {
      color: var(--text-main);
    }
  }
}

.gps-option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: left;
  min-height: 52px;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);

  &:hover {
    border-color: var(--border-focus);
  }

  .text-primary {
    color: var(--color-primary);
  }

  .gps-text {
    display: flex;
    flex-direction: column;

    strong {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
    }

    span {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  }
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.cities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  .city-chip {
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.85rem;
    font-weight: 600;
    min-height: 42px;
    @include flex-between;
    transition: border-color var(--transition-fast), background-color var(--transition-fast);

    &:hover {
      border-color: var(--border-focus);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--savings-bg);
      color: var(--color-primary);
      font-weight: 700;
    }
  }
}
</style>
