<script setup lang="ts">
import { ref } from 'vue';
import { SlidersHorizontal, ArrowUpDown, Clock, Tag, X } from 'lucide-vue-next';
import { useStations } from '../composables/useStations';
import { useHaptics } from '../composables/useHaptics';
import type { FuelId, SortMode } from '../types';
import gsap from 'gsap';

const props = withDefaults(
  defineProps<{
    onlyFuels?: boolean;
  }>(),
  {
    onlyFuels: false,
  }
);

const { fuel, radius, brand, open24h, sort, stats, filtersCatalog, fetchStations } = useStations();
const { light, medium } = useHaptics();

const expanded = ref(false);
const bottomSheetEl = ref<HTMLElement | null>(null);

// Touch drag to dismiss bottom sheet
let startY = 0;
let currentY = 0;
let isDragging = false;

const onTouchStart = (e: TouchEvent) => {
  startY = e.touches[0].clientY;
  isDragging = true;
};

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging || !bottomSheetEl.value) return;
  currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;
  if (deltaY > 0) {
    gsap.set(bottomSheetEl.value, { y: deltaY, force3D: true });
  }
};

const onTouchEnd = () => {
  if (!isDragging || !bottomSheetEl.value) return;
  isDragging = false;
  const deltaY = currentY - startY;

  if (deltaY > 90) {
    // Dismiss
    closeSheet();
  } else {
    // Snap back
    gsap.to(bottomSheetEl.value, { y: 0, duration: 0.2, ease: 'power2.out', force3D: true });
  }
};

const openSheet = () => {
  medium();
  expanded.value = true;
};

const closeSheet = () => {
  if (bottomSheetEl.value) {
    gsap.to(bottomSheetEl.value, {
      y: 300,
      opacity: 0,
      duration: 0.22,
      ease: 'power2.in',
      force3D: true,
      onComplete: () => {
        expanded.value = false;
        gsap.set(bottomSheetEl.value, { y: 0, opacity: 1 });
      },
    });
  } else {
    expanded.value = false;
  }
};

const handleFuelChange = (newFuel: FuelId) => {
  if (fuel.value === newFuel) return;
  light();
  fuel.value = newFuel;
  fetchStations();
};

const handleRadiusChange = (newRadius: number) => {
  if (radius.value === newRadius) return;
  light();
  radius.value = newRadius;
  fetchStations();
};

const handleSortChange = (newSort: SortMode) => {
  if (sort.value === newSort) return;
  light();
  sort.value = newSort;
  fetchStations();
};

const handleBrandChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  brand.value = target.value;
  light();
  fetchStations();
};

const handleOpen24hToggle = () => {
  open24h.value = !open24h.value;
  light();
  fetchStations();
};
</script>

<template>
  <div class="filter-bar" :class="{ 'only-fuels-mode': onlyFuels }">
    <!-- Quick Fuel Selector Pills (Horizontal Scroll) -->
    <div class="fuel-pills-scroll">
      <button
        v-for="f in filtersCatalog.fuels"
        :key="f.id"
        class="fuel-pill"
        :class="{ active: fuel === f.id }"
        @click="handleFuelChange(f.id)"
      >
        <span class="pill-short">{{ f.short_label }}</span>
      </button>

      <!-- Expand secondary filters toggle button -->
      <button
        v-if="!onlyFuels"
        class="toggle-filters-btn"
        :class="{ active: expanded || brand !== 'all' || open24h }"
        @click="expanded ? closeSheet() : openSheet()"
        aria-label="Más filtros"
      >
        <SlidersHorizontal :size="16" />
        <span class="filter-dot" v-if="brand !== 'all' || open24h"></span>
      </button>
    </div>

    <!-- Sticky Stats Bar: Siempre fijo mostrando Mínimo y Medio -->
    <div v-if="!onlyFuels && stats.count > 0" class="sticky-stats-summary">
      <span class="stats-text tabular-nums">
        {{ stats.count }} surtidores
        <template v-if="stats.minPrice"> · Mín: <span class="stat-min">{{ stats.minPrice.toFixed(3) }} €</span></template>
        <template v-if="stats.avgPrice"> · Media: <span class="stat-avg">{{ stats.avgPrice.toFixed(3) }} €</span></template>
      </span>
    </div>

    <!-- Draggable Bottom Sheet for Advanced Filters on Mobile / Dropdown on Desktop -->
    <div v-if="expanded" class="filters-backdrop" @click.self="closeSheet">
      <div
        ref="bottomSheetEl"
        class="bottom-sheet-panel"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <!-- Drag Handle for Mobile -->
        <div class="bottom-sheet-handle"></div>

        <div class="sheet-title-bar">
          <h4>Filtros Avanzados</h4>
          <button class="sheet-close-btn" @click="closeSheet" aria-label="Cerrar filtros">
            <X :size="18" />
          </button>
        </div>

        <div class="panel-content">
          <!-- Radius Selector -->
          <div class="filter-group">
            <label class="filter-label">Radio de búsqueda:</label>
            <div class="radius-chips">
              <button
                v-for="r in [2, 5, 10, 20, 35, 50]"
                :key="r"
                class="chip"
                :class="{ active: radius === r }"
                @click="handleRadiusChange(r)"
              >
                {{ r }} km
              </button>
            </div>
          </div>

          <!-- Sort Option -->
          <div class="filter-group">
            <label class="filter-label">
              <ArrowUpDown :size="13" />
              <span>Ordenar por:</span>
            </label>
            <div class="sort-chips">
              <button
                v-for="s in filtersCatalog.sort_options"
                :key="s.id"
                class="chip"
                :class="{ active: sort === s.id }"
                @click="handleSortChange(s.id)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- Brand & 24H Toggle Row -->
          <div class="filter-row">
            <!-- Brand Selector -->
            <div class="select-wrapper">
              <Tag :size="15" class="select-icon" />
              <select :value="brand" @change="handleBrandChange" class="filter-select">
                <option value="all">Todas las marcas</option>
                <option
                  v-for="b in filtersCatalog.popular_brands"
                  :key="b"
                  :value="b"
                >
                  {{ b }}
                </option>
              </select>
            </div>

            <!-- Open 24h switch -->
            <button
              class="switch-btn"
              :class="{ active: open24h }"
              @click="handleOpen24hToggle"
            >
              <Clock :size="15" />
              <span>Abiertas 24h</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.filter-bar {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.only-fuels-mode {
    background: transparent;
    border-bottom: none;
    padding: 0;

    .fuel-pills-scroll {
      gap: 6px;
      padding: 0;
    }

    .fuel-pill {
      background: var(--bg-surface);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      min-height: 38px;
      padding: 6px 14px;
      font-size: 0.8rem;
      font-weight: 600;

      &.active {
        background: var(--btn-cta-bg);
        border-color: var(--btn-cta-bg);
        color: var(--btn-cta-text);
        font-weight: 700;
      }
    }
  }
}

.fuel-pills-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }
}

.fuel-pill {
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.8rem;
  white-space: nowrap;
  min-height: 36px;
  transition: border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    border-color: var(--border-focus);
    color: var(--text-main);
  }

  &.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--btn-primary-text);
    font-weight: 700;
  }
}

.toggle-filters-btn {
  margin-left: auto;
  position: relative;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  @include flex-center;
  flex-shrink: 0;
  transition: border-color var(--transition-fast), color var(--transition-fast);

  &:hover {
    color: var(--text-main);
    border-color: var(--border-focus);
  }

  &.active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--savings-bg);
  }

  .filter-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
  }
}

// Fixed stats bar below fuel pills: clean single line of text
.sticky-stats-summary {
  display: flex;
  align-items: center;
  padding: 4px 0 2px;
  width: 100%;

  .stats-text {
    font-size: 0.775rem;
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    .stat-min {
      color: var(--savings-green);
      font-weight: 700;
    }

    .stat-avg {
      color: var(--text-main);
      font-weight: 600;
    }
  }
}

// Draggable Bottom Sheet modal for mobile
.filters-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 250;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @include desktop {
    align-items: center;
    padding: 20px;
  }
}

.bottom-sheet-panel {
  background: var(--bg-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border-top: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  max-height: 85dvh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 10px 20px calc(var(--bottom-nav-height) + var(--safe-bottom) + 24px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  touch-action: pan-y;

  @include desktop {
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    padding: 20px;
  }
}

.sheet-title-bar {
  @include flex-between;
  h4 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }
  .sheet-close-btn {
    color: var(--text-muted);
    min-width: 36px;
    min-height: 36px;
    &:hover {
      color: var(--text-main);
    }
  }
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .filter-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

.radius-chips, .sort-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  .chip {
    padding: 6px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    min-height: 36px;
    transition: border-color var(--transition-fast), color var(--transition-fast);

    &:hover {
      color: var(--text-main);
      border-color: var(--border-focus);
    }

    &.active {
      background: var(--savings-bg);
      border-color: var(--color-primary);
      color: var(--color-primary);
      font-weight: 700;
    }
  }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.select-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;

  .select-icon {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .filter-select {
    width: 100%;
    padding: 8px 10px 8px 34px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--text-main);
    min-height: 42px;

    &:focus {
      border-color: var(--border-focus);
    }
  }
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  font-size: 0.825rem;
  font-weight: 600;
  color: var(--text-muted);
  min-height: 42px;
  transition: border-color var(--transition-fast), color var(--transition-fast);
  white-space: nowrap;

  &:hover {
    color: var(--text-main);
    border-color: var(--border-focus);
  }

  &.active {
    background: var(--savings-bg);
    border-color: var(--color-primary);
    color: var(--color-primary);
    font-weight: 700;
  }
}
</style>
