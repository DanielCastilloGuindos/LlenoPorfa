<script setup lang="ts">
import { ref } from 'vue';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Fuel,
  Gauge,
  Check,
  Download,
  Share,
  PlusSquare,
  Smartphone,
  CheckCircle2,
} from 'lucide-vue-next';
import { useSettings } from '../composables/useSettings';
import { usePwaInstall } from '../composables/usePwaInstall';
import { useHaptics } from '../composables/useHaptics';
import type { FuelId } from '../types';

const { settings, saveSettings } = useSettings();
const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall();
const { light, success } = useHaptics();

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

const handleThemeChange = (themeId: 'light' | 'dark' | 'system') => {
  light();
  saveSettings({ theme: themeId });
};

const handleFuelChange = (fId: FuelId) => {
  light();
  saveSettings({ defaultFuel: fId });
};

const handleRadiusChange = (r: number) => {
  light();
  saveSettings({ defaultRadius: r });
};

const handleInstallPwa = async () => {
  light();
  const installed = await promptInstall();
  if (installed) success();
};
</script>

<template>
  <div class="settings-view">
    <div class="view-header">
      <h2>Ajustes y Preferencias</h2>
      <p>Configurá llenoPorfa para adaptarlo a tu vehículo y estilo.</p>
    </div>

    <!-- PWA Installation Card -->
    <div class="settings-card highlight-card">
      <div class="card-header-icon">
        <Smartphone :size="20" class="text-primary" />
        <h3 class="card-title">Aplicación Progresiva (PWA)</h3>
      </div>

      <div v-if="isStandalone" class="installed-badge">
        <CheckCircle2 :size="18" class="text-primary" />
        <span>llenoPorfa ya está instalada en tu pantalla de inicio en modo nativo.</span>
      </div>

      <div v-else-if="canInstall" class="install-prompt-box">
        <p class="card-desc">Instalá la app para abrirla a pantalla completa y consultar precios sin conexión.</p>
        <button class="install-btn" @click="handleInstallPwa">
          <Download :size="18" />
          <span>Instalar App en este dispositivo</span>
        </button>
      </div>

      <div v-else-if="isIos" class="ios-guide-box">
        <p class="card-desc">Para instalar en iPhone o iPad:</p>
        <ol class="ios-steps">
          <li>Pulsá el botón <strong>Compartir</strong> <Share :size="15" class="inline-icon" /> en la barra de Safari.</li>
          <li>Desplazate hacia abajo y seleccioná <strong>Añadir a pantalla de inicio</strong> <PlusSquare :size="15" class="inline-icon" />.</li>
        </ol>
      </div>

      <div v-else class="browser-info">
        <p class="card-desc">Esta aplicación cumple con los estándares PWA modernos y guarda precios automáticamente para su consulta sin conexión.</p>
      </div>
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
          @click="handleThemeChange(t.id)"
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
          @click="handleFuelChange(f.id)"
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
          @click="handleRadiusChange(r)"
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
  padding: 20px 16px 40px;
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
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.highlight-card {
    border-color: rgba(16, 185, 129, 0.35);
    background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-subtle) 100%);
  }

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
    margin-top: -4px;
  }
}

.installed-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--tier-low-bg);
  border-radius: var(--radius-md);
  font-size: 0.825rem;
  font-weight: 700;
  color: var(--tier-low);
}

.install-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  background: var(--color-primary);
  color: #ffffff;
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.875rem;
  min-height: 44px;
  box-shadow: 0 4px 12px var(--color-primary-glow);
  transition: all var(--transition-fast);

  &:hover {
    background: var(--color-primary-dark);
  }
}

.ios-steps {
  padding-left: 20px;
  font-size: 0.825rem;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  gap: 6px;

  .inline-icon {
    display: inline-block;
    vertical-align: middle;
    color: var(--color-primary);
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
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    font-weight: 600;
    font-size: 0.85rem;
    position: relative;
    min-height: 64px;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 800;

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
    padding: 12px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-main);
    min-height: 46px;
    @include flex-between;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--border-color);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 800;
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
    min-height: 36px;
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
    padding: 10px 16px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--text-muted);
    min-height: 44px;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--text-main);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary-dark);
      font-weight: 800;
    }
  }
}
</style>
