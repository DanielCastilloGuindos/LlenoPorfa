<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import {
  ReceiptText,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Fuel,
  Gauge,
  FileText,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Droplet,
  Euro,
  MapPin,
} from 'lucide-vue-next';
import type { RefuelLog, FuelId, Station } from '../types';
import { useRefuelLogs } from '../composables/useRefuelLogs';
import { useSettings } from '../composables/useSettings';
import { useStations } from '../composables/useStations';
import { useFavorites } from '../composables/useFavorites';
import gsap from 'gsap';

const { logs, stats, activePrefill, addLog, updateLog, deleteLog, clearPrefill } = useRefuelLogs();
const { settings } = useSettings();
const { stations, stats: stationsStats, fuel: currentFuelFilter } = useStations();
const { favorites } = useFavorites();

const isFormOpen = ref(false);
const editingLogId = ref<string | null>(null);
const prefillAvgPrice = ref<number | undefined>(undefined);

// Form Fields
const stationName = ref('');
const stationId = ref<string | undefined>(undefined);
const stationAddress = ref<string | undefined>(undefined);
const date = ref('');
const fuelType = ref<FuelId>('g95_e5');
const pricePerLiter = ref<number | ''>('');
const liters = ref<number | ''>('');
const totalAmount = ref<number | ''>('');
const odometerKm = ref<number | ''>('');
const notes = ref('');

const lastEditedField = ref<'price' | 'liters' | 'total'>('price');

const fuelOptions: { id: FuelId; label: string }[] = [
  { id: 'g95_e5', label: 'Gasolina 95 E5' },
  { id: 'diesel_a', label: 'Gasóleo A' },
  { id: 'g98_e5', label: 'Gasolina 98 E5' },
  { id: 'diesel_premium', label: 'Gasóleo Premium' },
  { id: 'glp', label: 'GLP' },
];

// Helper to get current ISO date formatted for datetime-local input
const getNowDateTimeLocal = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

// Available stations for quick picker (favorites + nearby)
const quickStations = computed<Station[]>(() => {
  const list: Station[] = [];
  const ids = new Set<string>();

  favorites.value.forEach((s) => {
    if (!ids.has(s.id)) {
      ids.add(s.id);
      list.push(s);
    }
  });

  stations.value.slice(0, 10).forEach((s) => {
    if (!ids.has(s.id)) {
      ids.add(s.id);
      list.push(s);
    }
  });

  return list;
});

// Auto-calculation logic for price, liters, and total amount
const onPriceInput = () => {
  lastEditedField.value = 'price';
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);

  if (p > 0) {
    if (l > 0) {
      totalAmount.value = Math.round(p * l * 100) / 100;
    } else if (t > 0) {
      liters.value = Math.round((t / p) * 100) / 100;
    }
  }
};

const onLitersInput = () => {
  lastEditedField.value = 'liters';
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);

  if (l > 0) {
    if (p > 0) {
      totalAmount.value = Math.round(p * l * 100) / 100;
    } else if (t > 0) {
      pricePerLiter.value = Math.round((t / l) * 1000) / 1000;
    }
  }
};

const onTotalInput = () => {
  lastEditedField.value = 'total';
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);

  if (t > 0) {
    if (p > 0) {
      liters.value = Math.round((t / p) * 100) / 100;
    } else if (l > 0) {
      pricePerLiter.value = Math.round((t / l) * 1000) / 1000;
    }
  }
};

const selectQuickStation = (st: Station) => {
  stationName.value = st.brand;
  stationId.value = st.id;
  stationAddress.value = st.address;

  // Autocomplete price if available for selected fuel
  const price = st.selected_fuel_price;
  if (price && price > 0) {
    pricePerLiter.value = price;
    onPriceInput();
  }
};

const openNewRefuelForm = () => {
  editingLogId.value = null;
  stationName.value = '';
  stationId.value = undefined;
  stationAddress.value = undefined;
  date.value = getNowDateTimeLocal();
  fuelType.value = settings.value.defaultFuel || 'g95_e5';
  pricePerLiter.value = '';
  liters.value = '';
  totalAmount.value = '';
  odometerKm.value = '';
  notes.value = '';

  // Apply prefill if set
  if (activePrefill.value) {
    stationName.value = activePrefill.value.stationName;
    stationId.value = activePrefill.value.stationId;
    stationAddress.value = activePrefill.value.stationAddress;
    if (activePrefill.value.fuelType) {
      fuelType.value = activePrefill.value.fuelType;
    }
    if (activePrefill.value.pricePerLiter) {
      pricePerLiter.value = activePrefill.value.pricePerLiter;
    }
    if (activePrefill.value.averagePrice) {
      prefillAvgPrice.value = activePrefill.value.averagePrice;
    }
    clearPrefill();
  } else {
    prefillAvgPrice.value = undefined;
  }

  isFormOpen.value = true;
};

const openEditRefuelForm = (item: RefuelLog) => {
  editingLogId.value = item.id;
  stationName.value = item.stationName;
  stationId.value = item.stationId;
  stationAddress.value = item.stationAddress;
  date.value = item.date;
  fuelType.value = item.fuelType;
  pricePerLiter.value = item.pricePerLiter;
  liters.value = item.liters;
  totalAmount.value = item.totalAmount;
  odometerKm.value = item.odometerKm ?? '';
  notes.value = item.notes ?? '';
  isFormOpen.value = true;
};

const handleSave = () => {
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);

  if (!stationName.value.trim() || p <= 0 || l <= 0 || t <= 0) {
    alert('Completá al menos la gasolinera, el precio y los litros o total.');
    return;
  }

  const avgP = prefillAvgPrice.value || stationsStats.value.avgPrice;
  const calculatedSavings =
    avgP && avgP > p ? Math.round((avgP - p) * l * 100) / 100 : undefined;

  const payload = {
    stationName: stationName.value.trim(),
    stationId: stationId.value,
    stationAddress: stationAddress.value,
    date: date.value || getNowDateTimeLocal(),
    fuelType: fuelType.value,
    pricePerLiter: p,
    liters: l,
    totalAmount: t,
    savingsEur: calculatedSavings,
    odometerKm: odometerKm.value !== '' ? Number(odometerKm.value) : null,
    notes: notes.value.trim() || undefined,
  };

  if (editingLogId.value) {
    updateLog(editingLogId.value, payload);
  } else {
    addLog(payload);
  }

  isFormOpen.value = false;
  animateList();
};

const animateList = () => {
  nextTick(() => {
    const cards = document.querySelectorAll('.refuel-card');
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power2.out' }
      );
    }
  });
};

watch(activePrefill, (prefill) => {
  if (prefill) {
    openNewRefuelForm();
  }
});

onMounted(() => {
  if (activePrefill.value) {
    openNewRefuelForm();
  }
  animateList();
});
</script>

<template>
  <div class="refuel-view">
    <!-- Header -->
    <div class="view-header">
      <div class="header-titles">
        <h2>Registro de Repostajes</h2>
        <p>Controlá tus gastos de combustible, litros y precio medio por repostaje.</p>
      </div>

      <button class="add-btn" @click="openNewRefuelForm">
        <Plus :size="18" />
        <span>Nuevo Repostaje</span>
      </button>
    </div>

    <!-- Quick Statistics Summary Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="icon-wrap euro">
          <Euro :size="18" />
        </div>
        <div class="stat-data">
          <span class="label">Gasto Total</span>
          <strong class="val">{{ stats.totalSpent.toFixed(2) }} €</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-wrap savings">
          <Sparkles :size="18" />
        </div>
        <div class="stat-data">
          <span class="label">Ahorro Estimado</span>
          <strong class="val highlight">{{ stats.totalSavings.toFixed(2) }} €</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-wrap drop">
          <Droplet :size="18" />
        </div>
        <div class="stat-data">
          <span class="label">Litros Totales</span>
          <strong class="val">{{ stats.totalLiters.toFixed(1) }} L</strong>
        </div>
      </div>

      <div class="stat-card">
        <div class="icon-wrap trend">
          <TrendingUp :size="18" />
        </div>
        <div class="stat-data">
          <span class="label">Precio Medio</span>
          <strong class="val">
            {{ stats.avgPricePerLiter > 0 ? stats.avgPricePerLiter.toFixed(3) : '---' }} €/L
          </strong>
        </div>
      </div>
    </div>

    <!-- New / Edit Form Modal -->
    <div v-if="isFormOpen" class="modal-backdrop" @click.self="isFormOpen = false">
      <div class="form-modal-card">
        <div class="modal-header">
          <div class="title-wrap">
            <ReceiptText :size="20" class="text-primary" />
            <h3>{{ editingLogId ? 'Editar Repostaje' : 'Registrar Nuevo Repostaje' }}</h3>
          </div>
          <button class="close-btn" @click="isFormOpen = false">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="handleSave" class="refuel-form">
          <!-- Quick station picker -->
          <div v-if="quickStations.length > 0 && !editingLogId" class="quick-picker-box">
            <label class="field-label">Surtidor rápido (cercanas / favoritas):</label>
            <div class="quick-chips">
              <button
                type="button"
                v-for="st in quickStations.slice(0, 5)"
                :key="st.id"
                class="quick-chip"
                :class="{ active: stationId === st.id }"
                @click="selectQuickStation(st)"
              >
                <span>{{ st.brand }}</span>
                <small v-if="st.selected_fuel_price">{{ st.selected_fuel_price.toFixed(3) }}€</small>
              </button>
            </div>
          </div>

          <!-- Station Name -->
          <div class="form-group">
            <label class="field-label">Gasolinera (Nombre o Rótulo)*</label>
            <div class="input-icon-wrap">
              <MapPin :size="16" class="field-icon" />
              <input
                v-model="stationName"
                type="text"
                required
                placeholder="Ej. Repsol Gran Vía, Plenoil..."
                class="form-input"
              />
            </div>
          </div>

          <!-- Date & Time & Fuel Type -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="field-label">Fecha y Hora*</label>
              <input v-model="date" type="datetime-local" required class="form-input" />
            </div>

            <div class="form-group flex-1">
              <label class="field-label">Carburante*</label>
              <select v-model="fuelType" class="form-select">
                <option v-for="f in fuelOptions" :key="f.id" :value="f.id">
                  {{ f.label }}
                </option>
              </select>
            </div>
          </div>

          <!-- Price, Liters & Total (Auto-calculated!) -->
          <div class="calc-box">
            <div class="calc-header">
              <Sparkles :size="14" class="text-primary" />
              <span>Cálculo automático: completá 2 campos y el 3º se calcula solo</span>
            </div>

            <div class="calc-grid">
              <div class="form-group">
                <label class="field-label">Precio (€/L)*</label>
                <input
                  v-model.number="pricePerLiter"
                  type="number"
                  step="0.001"
                  min="0.1"
                  required
                  placeholder="1.629"
                  class="form-input font-mono"
                  @input="onPriceInput"
                />
              </div>

              <div class="form-group">
                <label class="field-label">Litros (L)*</label>
                <input
                  v-model.number="liters"
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="45.5"
                  class="form-input font-mono"
                  @input="onLitersInput"
                />
              </div>

              <div class="form-group">
                <label class="field-label">Importe Total (€)*</label>
                <input
                  v-model.number="totalAmount"
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="74.12"
                  class="form-input font-mono total-input"
                  @input="onTotalInput"
                />
              </div>
            </div>
          </div>

          <!-- Odometer & Notes -->
          <div class="form-row">
            <div class="form-group flex-1">
              <label class="field-label">Kilometraje actual (km)</label>
              <div class="input-icon-wrap">
                <Gauge :size="16" class="field-icon" />
                <input
                  v-model.number="odometerKm"
                  type="number"
                  step="1"
                  placeholder="Ej. 124500"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-group flex-1">
              <label class="field-label">Notas breves</label>
              <div class="input-icon-wrap">
                <FileText :size="16" class="field-icon" />
                <input
                  v-model="notes"
                  type="text"
                  placeholder="Ej. Depósito lleno antes de viaje"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="isFormOpen = false">
              Cancelar
            </button>
            <button type="submit" class="btn-primary">
              <Check :size="18" />
              <span>{{ editingLogId ? 'Actualizar' : 'Guardar Repostaje' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="logs.length === 0" class="empty-state">
      <ReceiptText :size="52" class="empty-icon" />
      <h3>No tenés repostajes registrados</h3>
      <p>Registrá tu primer llenado pulsando en "Nuevo Repostaje" o directamente desde el detalle de cualquier gasolinera.</p>
      <button class="empty-action-btn" @click="openNewRefuelForm">
        <Plus :size="16" />
        <span>Añadir primer repostaje</span>
      </button>
    </div>

    <!-- Chronological Refuel History List -->
    <div v-else class="logs-list">
      <article v-for="item in logs" :key="item.id" class="refuel-card">
        <div class="card-left">
          <div class="station-meta">
            <h4 class="card-station-name">{{ item.stationName }}</h4>
            <span class="card-date">{{ new Date(item.date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
          </div>

          <div class="badge-row">
            <span class="pill-fuel">{{ item.fuelType.toUpperCase() }}</span>
            <span class="pill-data">{{ item.pricePerLiter.toFixed(3) }} €/L</span>
            <span class="pill-data">{{ item.liters.toFixed(2) }} L</span>
            <span v-if="item.savingsEur && item.savingsEur > 0" class="pill-savings">
              <Sparkles :size="11" />
              <span>Ahorro: ~{{ item.savingsEur.toFixed(2) }} €</span>
            </span>
            <span v-if="item.odometerKm" class="pill-km">{{ item.odometerKm.toLocaleString() }} km</span>
          </div>

          <p v-if="item.notes" class="card-notes">"{{ item.notes }}"</p>
        </div>

        <div class="card-right">
          <div class="total-display">
            <span class="amount">{{ item.totalAmount.toFixed(2) }}</span>
            <span class="currency">€</span>
          </div>

          <div class="action-buttons">
            <button class="icon-btn edit" @click="openEditRefuelForm(item)" title="Editar">
              <Edit2 :size="15" />
            </button>
            <button class="icon-btn delete" @click="deleteLog(item.id)" title="Eliminar">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "../styles/mixins" as *;

.refuel-view {
  padding: 20px 16px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 800px;
  margin: 0 auto;
}

.view-header {
  @include flex-between;
  gap: 12px;
  flex-wrap: wrap;

  .header-titles {
    h2 {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
    }
    p {
      font-size: 0.825rem;
      color: var(--text-muted);
    }
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    background: var(--color-primary);
    color: #ffffff;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 700;
    box-shadow: 0 4px 12px var(--color-primary-glow);
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary-dark);
      transform: translateY(-1px);
    }
  }
}

// Stats row
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  @include mobile {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    @include card-surface;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;

    .icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      @include flex-center;
      flex-shrink: 0;

      &.euro {
        background: rgba(16, 185, 129, 0.15);
        color: var(--color-primary);
      }
      &.savings {
        background: rgba(16, 185, 129, 0.2);
        color: var(--color-primary);
      }
      &.drop {
        background: rgba(59, 130, 246, 0.15);
        color: #3b82f6;
      }
      &.trend {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }
    }

    .stat-data {
      display: flex;
      flex-direction: column;

      .label {
        font-size: 0.675rem;
        color: var(--text-muted);
        font-weight: 600;
        text-transform: uppercase;
      }

      .val {
        font-size: 1.15rem;
        font-weight: 900;
        font-family: var(--font-mono);
        color: var(--text-main);

        &.highlight {
          color: var(--color-primary);
        }
      }
    }
  }
}

// Logs List
.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.refuel-card {
  @include card-surface;
  padding: 14px 16px;
  @include flex-between;
  gap: 16px;

  .card-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;

    .station-meta {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;

      .card-station-name {
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text-main);
      }

      .card-date {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    }

    .badge-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;

      .pill-fuel {
        background: var(--color-primary-light);
        color: var(--color-primary-dark);
        font-size: 0.7rem;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: var(--radius-sm);

        [data-theme="dark"] & {
          background: rgba(16, 185, 129, 0.2);
          color: var(--color-primary);
        }
      }

      .pill-data {
        background: var(--bg-surface-subtle);
        border: 1px solid var(--border-color);
        font-size: 0.725rem;
        font-weight: 700;
        color: var(--text-main);
        padding: 2px 7px;
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
      }

      .pill-savings {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        background: rgba(16, 185, 129, 0.12);
        color: var(--color-primary);
        font-size: 0.725rem;
        font-weight: 700;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      .pill-km {
        font-size: 0.725rem;
        color: var(--text-muted);
        font-weight: 600;
      }
    }

    .card-notes {
      font-size: 0.8rem;
      font-style: italic;
      color: var(--text-muted);
    }
  }

  .card-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;

    .total-display {
      display: flex;
      align-items: baseline;
      gap: 2px;

      .amount {
        font-size: 1.45rem;
        font-weight: 900;
        font-family: var(--font-mono);
        color: var(--color-primary);
      }

      .currency {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--text-muted);
      }
    }

    .action-buttons {
      display: flex;
      gap: 4px;

      .icon-btn {
        padding: 6px;
        border-radius: var(--radius-md);
        color: var(--text-muted);
        transition: all var(--transition-fast);

        &:hover.edit {
          color: var(--color-primary);
          background: var(--color-primary-light);
        }

        &:hover.delete {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
      }
    }
  }
}

// Empty state
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 20px;
  text-align: center;
  gap: 12px;
  color: var(--text-muted);

  .empty-icon {
    opacity: 0.35;
    color: var(--color-primary);
  }

  h3 {
    color: var(--text-main);
    font-size: 1.15rem;
  }

  p {
    font-size: 0.875rem;
    max-width: 320px;
  }

  .empty-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    padding: 9px 18px;
    background: var(--color-primary);
    color: #ffffff;
    font-weight: 700;
    font-size: 0.85rem;
    border-radius: var(--radius-md);
  }
}

// Modal Form Styles
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 250;
  @include flex-center;
  padding: 16px;
}

.form-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  @include flex-between;

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;

    .text-primary {
      color: var(--color-primary);
    }

    h3 {
      font-size: 1.15rem;
      font-weight: 800;
    }
  }

  .close-btn {
    color: var(--text-muted);
    padding: 4px;
    &:hover {
      color: var(--text-main);
    }
  }
}

.refuel-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-label {
  font-size: 0.775rem;
  font-weight: 700;
  color: var(--text-muted);
  display: block;
  margin-bottom: 4px;
}

.input-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .field-icon {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
  }

  .form-input {
    padding-left: 34px !important;
  }
}

.form-input, .form-select {
  width: 100%;
  padding: 9px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  color: var(--text-main);
  transition: all var(--transition-fast);

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-glow);
  }

  &.font-mono {
    font-family: var(--font-mono);
    font-weight: 700;
  }
}

.form-row {
  display: flex;
  gap: 12px;

  @include mobile {
    flex-direction: column;
  }

  .flex-1 {
    flex: 1;
  }
}

.calc-box {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .calc-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-primary-dark);

    [data-theme="dark"] & {
      color: var(--color-primary);
    }
  }

  .calc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  .total-input {
    color: var(--color-primary);
    font-size: 1rem;
    font-weight: 800;
  }
}

.quick-picker-box {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .quick-chips {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: var(--radius-full);
    }

    .quick-chip {
      padding: 6px 12px;
      border-radius: var(--radius-md);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      font-size: 0.775rem;
      font-weight: 600;
      color: var(--text-main);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      flex-shrink: 0;
      min-height: 38px;
      cursor: pointer;
      transition: all var(--transition-fast);

      small {
        color: var(--color-primary);
        font-weight: 700;
      }

      &.active {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
        color: var(--color-primary-dark);
      }
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;

  .btn-secondary {
    padding: 9px 16px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-muted);
    &:hover {
      color: var(--text-main);
    }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #ffffff;
    font-weight: 700;
    font-size: 0.875rem;
    transition: all var(--transition-fast);

    &:hover {
      background: var(--color-primary-dark);
    }
  }
}
</style>
