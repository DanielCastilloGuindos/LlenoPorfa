<script setup lang="ts">
import { ref, nextTick } from 'vue';
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
  Car,
  FileText,
  Trash2,
  Edit2,
  Plus,
  Heart,
  X,
  Radio,
  Bell,
} from 'lucide-vue-next';
import { useSettings } from '../composables/useSettings';
import { usePwaInstall } from '../composables/usePwaInstall';
import { useNativeRadar } from '../composables/useNativeRadar';
import { useHaptics } from '../composables/useHaptics';
import type { FuelId, Vehicle } from '../types';

const {
  settings,
  vehicles,
  activeVehicle,
  saveSettings,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  setActiveVehicle,
} = useSettings();
const { canInstall, isStandalone, isIos, promptInstall } = usePwaInstall();
const { light, success } = useHaptics();
const { isNative, isRadarRunning, radarError } = useNativeRadar();

const toggleBackgroundRadar = () => {
  light();
  saveSettings({ nativeBackgroundRadar: !settings.value.nativeBackgroundRadar });
};

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

// Vehicle Form State
const isVehicleModalOpen = ref(false);
const editingVehicleId = ref<string | null>(null);
const aliasInputRef = ref<HTMLInputElement | null>(null);
const vehicleAlias = ref('');
const vehicleBrand = ref('');
const vehicleModel = ref('');
const vehiclePlate = ref('');
const vehicleFuelType = ref<FuelId>('g95_e5');
const vehicleTankCapacity = ref<number>(50);

const openAddVehicleModal = () => {
  editingVehicleId.value = null;
  vehicleAlias.value = '';
  vehicleBrand.value = '';
  vehicleModel.value = '';
  vehiclePlate.value = '';
  vehicleFuelType.value = settings.value.defaultFuel || 'g95_e5';
  vehicleTankCapacity.value = settings.value.tankCapacityLiters || 50;
  isVehicleModalOpen.value = true;
  nextTick(() => {
    aliasInputRef.value?.focus();
  });
};

const openEditVehicleModal = (veh: Vehicle) => {
  editingVehicleId.value = veh.id;
  vehicleAlias.value = veh.alias;
  vehicleBrand.value = veh.brand;
  vehicleModel.value = veh.model;
  vehiclePlate.value = veh.plate;
  vehicleFuelType.value = veh.fuelType;
  vehicleTankCapacity.value = veh.tankCapacityLiters;
  isVehicleModalOpen.value = true;
  nextTick(() => {
    aliasInputRef.value?.focus();
  });
};

const handleSaveVehicle = () => {
  if (!vehicleAlias.value.trim() || !vehiclePlate.value.trim()) {
    alert('Completá al menos el nombre/alias y la matrícula.');
    return;
  }

  const payload = {
    alias: vehicleAlias.value.trim(),
    brand: vehicleBrand.value.trim() || 'Desconocida',
    model: vehicleModel.value.trim() || '',
    plate: vehiclePlate.value.trim().toUpperCase(),
    fuelType: vehicleFuelType.value,
    tankCapacityLiters: Number(vehicleTankCapacity.value) || 50,
  };

  if (editingVehicleId.value) {
    updateVehicle(editingVehicleId.value, payload);
  } else {
    addVehicle(payload);
  }

  isVehicleModalOpen.value = false;
};

const handleFiscalChange = (key: 'fiscalName' | 'fiscalNif', value: string) => {
  saveSettings({ [key]: value.trim() });
};

const supportUrl =
  (typeof window !== 'undefined' && (window as any).PUBLIC_SUPPORT_URL) ||
  'https://buymeacoffee.com/llenoporfa';

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

    <!-- Native Background Radar Card -->
    <div class="settings-card">
      <div class="card-header-between">
        <div class="card-header-icon">
          <Radio :size="20" class="text-primary" />
          <h3 class="card-title">Radar de Ahorro en Segundo Plano</h3>
        </div>
        <button
          class="radar-switch"
          :class="{ active: settings.nativeBackgroundRadar }"
          @click="toggleBackgroundRadar"
          role="switch"
          :aria-checked="!!settings.nativeBackgroundRadar"
        >
          <span class="switch-handle"></span>
        </button>
      </div>
      <p class="card-desc">
        Monitorea precios cercanos mientras te desplazas con bajo consumo de batería (filtro de 400m). Te avisa de chollos a menos de 800m (-0,08 €/L) y detecta cuándo llegas a una gasolinera para registrar el repostaje.
      </p>
      <div v-if="!isNative" class="native-radar-notice">
        <Smartphone :size="15" />
        <span>Disponible en la versión instalable para Android / iOS. En web/PWA el radar funciona en primer plano.</span>
      </div>
      <div v-if="radarError" class="radar-error-notice">
        {{ radarError }}
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

    <!-- Multi-Vehicle Section -->
    <div class="settings-card">
      <div class="card-header-between">
        <div class="card-header-icon">
          <Car :size="20" class="text-primary" />
          <h3 class="card-title">Mis Vehículos</h3>
        </div>
        <button class="add-vehicle-btn" @click="openAddVehicleModal">
          <Plus :size="16" />
          <span>Añadir</span>
        </button>
      </div>
      <p class="card-desc">Gestioná tus coches o motos para filtrar repostajes y vincular consumos.</p>

      <div v-if="vehicles.length === 0" class="vehicle-empty">
        <p>No tenés vehículos dados de alta. Podés añadir tu coche habitual para facilitar los registros.</p>
      </div>

      <div v-else class="vehicle-list">
        <div
          v-for="v in vehicles"
          :key="v.id"
          class="vehicle-item"
          :class="{ active: settings.activeVehicleId === v.id }"
        >
          <div class="vehicle-info" @click="setActiveVehicle(v.id)">
            <div class="vehicle-title-row">
              <strong class="vehicle-alias">{{ v.alias }}</strong>
              <span v-if="settings.activeVehicleId === v.id" class="badge-active">Activo</span>
            </div>
            <span class="vehicle-sub">{{ v.brand }} {{ v.model }} • {{ v.plate }} • {{ v.tankCapacityLiters }}L</span>
          </div>

          <div class="vehicle-actions">
            <button class="icon-btn edit" @click="openEditVehicleModal(v)" title="Editar vehículo">
              <Edit2 :size="14" />
            </button>
            <button class="icon-btn delete" @click="deleteVehicle(v.id)" title="Eliminar vehículo">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Fiscal Data for Freelancers and Companies -->
    <div class="settings-card">
      <div class="card-header-icon">
        <FileText :size="20" class="text-primary" />
        <h3 class="card-title">Datos Fiscales (Autónomos / Gestoría)</h3>
      </div>
      <p class="card-desc">Se incluirán en el informe trimestral y CSV de repostajes para deducir el gasto.</p>

      <div class="fiscal-grid">
        <div class="form-group">
          <label class="field-label">CIF / NIF</label>
          <input
            :value="settings.fiscalNif"
            type="text"
            placeholder="Ej. B12345678 o 12345678Z"
            class="form-input uppercase"
            @input="handleFiscalChange('fiscalNif', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="form-group">
          <label class="field-label">Razón Social / Nombre Comercial</label>
          <input
            :value="settings.fiscalName"
            type="text"
            placeholder="Ej. Mi Empresa S.L."
            class="form-input"
            @input="handleFiscalChange('fiscalName', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- Project Support Card -->
    <div class="settings-card support-card">
      <div class="card-header-icon">
        <Heart :size="20" class="text-accent" />
        <h3 class="card-title">Apoyo al Proyecto</h3>
      </div>
      <p class="card-desc">
        llenoPorfa es una iniciativa independiente sin ánimo de lucro y sin publicidad invasiva.
        Si la herramienta te resulta de utilidad para ahorrar, podés colaborar para cubrir los costes de hosting y dominios.
      </p>
      <a
        :href="supportUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="support-project-btn"
      >
        <span>☕ Invitar a un café / Colaborar</span>
      </a>
    </div>

    <!-- Vehicle Modal -->
    <Teleport to="body">
      <div v-if="isVehicleModalOpen" class="modal-backdrop" @click.self="isVehicleModalOpen = false">
        <div class="vehicle-modal-card">
          <div class="modal-header">
            <h3>{{ editingVehicleId ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo' }}</h3>
            <button class="close-btn" @click="isVehicleModalOpen = false">
              <X :size="18" />
            </button>
          </div>

          <form @submit.prevent="handleSaveVehicle" class="vehicle-form">
            <div class="form-group">
              <label class="field-label">Nombre / Alias del vehículo*</label>
              <input
                ref="aliasInputRef"
                v-model="vehicleAlias"
                type="text"
                required
                placeholder="Ej. Coche familiar, Furgoneta reparto..."
                class="form-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="field-label">Marca</label>
                <input v-model="vehicleBrand" type="text" placeholder="Ej. Toyota" class="form-input" />
              </div>
              <div class="form-group flex-1">
                <label class="field-label">Modelo</label>
                <input v-model="vehicleModel" type="text" placeholder="Ej. Yaris Cross" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="field-label">Matrícula*</label>
                <input
                  v-model="vehiclePlate"
                  type="text"
                  required
                  placeholder="1234 ABC"
                  class="form-input font-mono uppercase"
                />
              </div>
              <div class="form-group flex-1">
                <label class="field-label">Capacidad Depósito (L)</label>
                <input
                  v-model.number="vehicleTankCapacity"
                  type="number"
                  min="10"
                  max="250"
                  class="form-input font-mono"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="field-label">Combustible habitual</label>
              <select v-model="vehicleFuelType" class="form-select">
                <option v-for="f in fuelOptions" :key="f.id" :value="f.id">{{ f.label }}</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-secondary" @click="isVehicleModalOpen = false">Cancelar</button>
              <button type="submit" class="btn-primary">
                <Check :size="16" />
                <span>Guardar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
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

.card-header-between {
  @include flex-between;
}

.add-vehicle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--color-primary);
  color: #ffffff;
  border-radius: var(--radius-sm);
  font-size: 0.775rem;
  font-weight: 700;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }
}

.vehicle-empty {
  padding: 12px;
  background: var(--bg-surface-subtle);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: 0.825rem;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);

  &.active {
    border-color: var(--color-primary);
    background: var(--color-primary-light);
  }

  .vehicle-info {
    cursor: pointer;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .vehicle-title-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .vehicle-alias {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .badge-active {
        font-size: 0.675rem;
        font-weight: 800;
        text-transform: uppercase;
        background: var(--color-primary);
        color: #ffffff;
        padding: 2px 6px;
        border-radius: var(--radius-full);
      }
    }

    .vehicle-sub {
      font-size: 0.775rem;
      color: var(--text-muted);
    }
  }

  .vehicle-actions {
    display: flex;
    align-items: center;
    gap: 6px;

    .icon-btn {
      padding: 6px;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;

      &:hover {
        background: var(--bg-surface);
        color: var(--text-main);
      }

      &.delete:hover {
        color: #ef4444;
      }
    }
  }
}

.fiscal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.support-card {
  border-color: rgba(245, 158, 11, 0.4);
  background: linear-gradient(180deg, var(--bg-surface) 0%, rgba(245, 158, 11, 0.05) 100%);

  .text-accent {
    color: #f59e0b;
  }

  .support-project-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    background: #f59e0b;
    color: #ffffff;
    font-size: 0.85rem;
    font-weight: 700;
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: background 0.15s ease;
    align-self: flex-start;

    &:hover {
      background: #d97706;
    }
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &.flex-1 {
    flex: 1;
  }
}

.form-row {
  display: flex;
  gap: 10px;

  @include mobile {
    flex-direction: column;
  }
}

.field-label {
  font-size: 0.775rem;
  font-weight: 700;
  color: var(--text-muted);
}

.form-input,
.form-select {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 500;
  min-height: 42px;

  &:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  &.font-mono {
    font-family: var(--font-mono);
  }

  &.uppercase {
    text-transform: uppercase;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  @include flex-center;
  padding: 16px;
}

.vehicle-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 460px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .modal-header {
    @include flex-between;

    h3 {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .close-btn {
      color: var(--text-muted);
      padding: 4px;

      &:hover {
        color: var(--text-main);
      }
    }
  }

  .vehicle-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;

    .btn-secondary {
      padding: 8px 14px;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.825rem;

      &:hover {
        color: var(--text-main);
      }
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 700;

      &:hover {
        background: var(--color-primary-dark);
      }
    }
  }
}

.radar-switch {
  width: 48px;
  height: 26px;
  background: var(--border-color);
  border-radius: var(--radius-full);
  position: relative;
  border: none;
  cursor: pointer;
  padding: 2px;
  transition: background var(--transition-fast);

  &.active {
    background: var(--color-primary);

    .switch-handle {
      transform: translateX(22px);
    }
  }

  .switch-handle {
    display: block;
    width: 22px;
    height: 22px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: transform var(--transition-fast);
  }
}

.native-radar-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-surface-subtle);
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  color: var(--text-muted);
}

.radar-error-notice {
  font-size: 0.775rem;
  color: #ef4444;
  padding: 6px 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-sm);
}
</style>
