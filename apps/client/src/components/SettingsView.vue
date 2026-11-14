<script setup lang="ts">
import { ref } from 'vue';
import { Settings, Moon, Sun, Monitor, Fuel, Gauge, Check } from 'lucide-vue-next';
import { useSettings } from '../composables/useSettings';
import type { FuelId } from '../types';

const { settings, saveSettings } = useSettings();

const fuelOptions: { id: FuelId; label: string }[] = [
  { id: 'g95_e5', label: 'Gasolina 95 E5' },
  { id: 'diesel_a', label: 'Gasóleo A' },
  { id: 'g98_e5', label: 'Gasolina 98 E5' },
  { id: 'diesel_premium', label: 'Gasóleo Premium' },
  { id: 'glp', label: 'GLP' },
];

const radiusOptions = [2, 5, 10, 20, 35, 50];

const themes: { id: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
  { id: 'light', label: 'Claro', icon: Sun },
  { id: 'dark', label: 'Oscuro', icon: Moon },
  { id: 'system', label: 'Sistema', icon: Monitor },
];
</script>

<template>
  <div class="settings-view">
    <div class="view-header">
      <h2>Ajustes y Preferencias</h2>
      <p>Configura llenoPorfa para adaptarlo a tu vehículo y estilo.</p>
    </div>

    <!-- Theme selection -->
    <div class="settings-card">
      <h3 class="card-title">Tema Visual</h3>
      <div class="theme-grid">
        <button
          v-for="t in themes"
          :key="t.id"
          class="theme-btn"
          :class="{ active: settings.theme === t.id }"
          @click="saveSettings({ theme: t.id })"
        >
          <component :is="t.icon" :size="20" />
          <span>{{ t.label }}</span>
          <Check v-if="settings.theme === t.id" :size="16" class="check-icon" />
        </button>
      </div>
    </div>

    <!-- Default Fuel -->
    <div class="settings-card">
      <div class="card-header-icon">
        <Fuel :size="20" class="text-primary" />
        <h3 class="card-title">Combustible por Defecto</h3>
      </div>
      <p class="card-desc">El tipo de carburante que se seleccionará automáticamente al abrir la app.</p>

      <div class="fuel-grid">
        <button
          v-for="f in fuelOptions"
          :key="f.id"
          class="option-pill"
          :class="{ active: settings.defaultFuel === f.id }"
          @click="saveSettings({ defaultFuel: f.id })"
        >
          <span>{{ f.label }}</span>
          <Check v-if="settings.defaultFuel === f.id" :size="14" />
        </button>
      </div>
    </div>

    <!-- Tank Capacity -->
    <div class="settings-card">
      <div class="card-header-icon">
        <Gauge :size="20" class="text-primary" />
        <h3 class="card-title">Capacidad del Depósito</h3>
      </div>
      <p class="card-desc">
        Usado para calcular el ahorro estimado en euros al llenar tu depósito frente a la media de la zona.
      </p>

      <div class="slider-box">
        <div class="slider-display">
          <span class="value">{{ settings.tankCapacityLiters }}</span>
          <span class="unit">Litros</span>
        </div>

        <input
          type="range"
          min="20"
          max="120"
          step="5"
          :value="settings.tankCapacityLiters"
          @input="saveSettings({ tankCapacityLiters: Number(($event.target as HTMLInputElement).value) })"
          class="tank-slider"
        />

        <div class="slider-marks">
          <span>20L (Moto/Compacto)</span>
          <span>50L (Turismo)</span>
          <span>80L (SUV/Furgoneta)</span>
        </div>
      </div>
    </div>

    <!-- Default Radius -->
    <div class="settings-card">
      <h3 class="card-title">Radio de Búsqueda Inicial</h3>
      <p class="card-desc">Distancia en kilómetros tomada al iniciar búsquedas.</p>

      <div class="radius-grid">
        <button
          v-for="r in radiusOptions"
          :key="r"
          class="radius-chip"
          :class="{ active: settings.defaultRadius === r }"
          @click="saveSettings({ defaultRadius: r })"
        >
          {{ r }} km
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.settings-view {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 640px;
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

.settings-card {
  @include card-surface;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .card-header-icon {
    display: flex;
    align-items: center;
    gap: 8px;
    .text-primary {
      color: var(--color-primary);
    }
  }

  .card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
  }

  .card-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-top: -6px;
  }
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .theme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.85rem;
    position: relative;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 700;

      [data-theme="dark"] & {
        background: rgba(16, 185, 129, 0.2);
        color: var(--color-primary);
      }
    }

    .check-icon {
      position: absolute;
      top: 6px;
      right: 6px;
      color: var(--color-primary);
    }
  }
}

.fuel-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .option-pill {
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-main);
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

.slider-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;

  .slider-display {
    display: flex;
    align-items: baseline;
    gap: 6px;

    .value {
      font-size: 2rem;
      font-weight: 900;
      font-family: var(--font-mono);
      color: var(--color-primary);
    }

    .unit {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-muted);
    }
  }

  .tank-slider {
    width: 100%;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .slider-marks {
    @include flex-between;
    font-size: 0.725rem;
    color: var(--text-muted);
  }
}

.radius-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .radius-chip {
    padding: 8px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
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
