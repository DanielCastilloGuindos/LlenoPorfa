<script setup lang="ts">
import { ref, watch } from 'vue';
import { SlidersHorizontal, ArrowUpDown, Clock, Tag } from 'lucide-vue-next';
import { useStations } from '../composables/useStations';
import type { FuelId, SortMode } from '../types';
import gsap from 'gsap';

const { fuel, radius, brand, open24h, sort, filtersCatalog, fetchStations } = useStations();

const expanded = ref(false);
const filtersPanel = ref<HTMLElement | null>(null);

const toggleExpand = () => {
  expanded.value = !expanded.value;

  if (filtersPanel.value) {
    if (expanded.value) {
      gsap.fromTo(
        filtersPanel.value,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.28, ease: 'power2.out' }
      );
    } else {
      gsap.to(filtersPanel.value, {
        height: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      });
    }
  }
};

const handleFuelChange = (newFuel: FuelId) => {
  if (fuel.value === newFuel) return;
  fuel.value = newFuel;
  fetchStations();
};

const handleRadiusChange = (newRadius: number) => {
  if (radius.value === newRadius) return;
  radius.value = newRadius;
  fetchStations();
};

const handleSortChange = (newSort: SortMode) => {
  if (sort.value === newSort) return;
  sort.value = newSort;
  fetchStations();
};

const handleBrandChange = (e: Event) => {
  const target = e.target as HTMLSelectElement;
  brand.value = target.value;
  fetchStations();
};

const handleOpen24hToggle = () => {
  open24h.value = !open24h.value;
  fetchStations();
};
</script>

<template>
  <div class="filter-bar">
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
        class="toggle-filters-btn"
        :class="{ active: expanded || brand !== 'all' || open24h }"
        @click="toggleExpand"
        aria-label="Más filtros"
      >
        <SlidersHorizontal :size="15" />
        <span class="filter-dot" v-if="brand !== 'all' || open24h"></span>
      </button>
    </div>

    <!-- Secondary Filters Expandable Panel (GSAP Animated) -->
    <div ref="filtersPanel" class="filters-panel" v-show="expanded">
      <div class="panel-content">
        <!-- Radius Selector -->
        <div class="filter-group">
          <label class="filter-label">Radio de búsqueda:</label>
          <div class="radius-chips">
            <button
              v-for="r in [2, 5, 10, 25, 50]"
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
            <Tag :size="14" class="select-icon" />
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
            <Clock :size="14" />
            <span>Abiertas 24h</span>
          </button>
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
  font-weight: 700;
  font-size: 0.8rem;
  white-space: nowrap;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--color-primary);
    color: var(--text-main);
  }

  &.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #ffffff;
    box-shadow: 0 2px 8px var(--color-primary-glow);
  }
}

.toggle-filters-btn {
  margin-left: auto;
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  @include flex-center;
  flex-shrink: 0;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--text-main);
  }

  &.active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .filter-dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
  }
}

.filters-panel {
  overflow: hidden;

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 12px;
    margin-top: 8px;
    border-top: 1px dashed var(--border-color);
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

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
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.775rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
    }

    &.active {
      background: var(--color-primary-light);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
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
    padding: 7px 10px 7px 32px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-main);
  }
}

.switch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: all var(--transition-fast);
  white-space: nowrap;

  &:hover {
    color: var(--text-main);
  }

  &.active {
    background: var(--color-primary-light);
    border-color: var(--color-primary);
    color: var(--color-primary-dark);
    font-weight: 700;
  }
}
</style>
