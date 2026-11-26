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
  TrendingDown,
  TrendingUp,
  Droplet,
  Euro,
  MapPin,
  Car,
  Download,
  Printer,
  Heart,
  Camera,
  Eye,
} from 'lucide-vue-next';
import type { RefuelLog, FuelId, Station } from '../types';
import { useRefuelLogs } from '../composables/useRefuelLogs';
import { useSettings } from '../composables/useSettings';
import { useStations } from '../composables/useStations';
import { useFavorites } from '../composables/useFavorites';
import { useTelemetry } from '../composables/useTelemetry';
import { useMaintenance } from '../composables/useMaintenance';
import gsap from 'gsap';

const { logs, stats, activePrefill, addLog, updateLog, deleteLog, clearPrefill } = useRefuelLogs();
const { settings, vehicles, activeVehicle } = useSettings();
const { stations, stats: stationsStats, fuel: currentFuelFilter } = useStations();
const { favorites } = useFavorites();
const { trackEvent } = useTelemetry();
const { evaluate } = useMaintenance();

const isFormOpen = ref(false);
const editingLogId = ref<string | null>(null);
const prefillAvgPrice = ref<number | undefined>(undefined);

// Filter States
const filterVehicle = ref<string>('all');
const filterTrimester = ref<'all' | '1T' | '2T' | '3T' | '4T'>('all');
const filterYear = ref<number>(new Date().getFullYear());

// Voluntary Support Modal
const showSupportModal = ref(false);
const savedAmountPrompt = ref(0);
const supportUrl = computed(() => {
  return (
    (typeof window !== 'undefined' && (window as any).PUBLIC_SUPPORT_URL) ||
    'https://buymeacoffee.com/llenoporfa'
  );
});

// Form Fields
const selectedVehicleId = ref<string>('');
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

const calculatedField = computed<'price' | 'liters' | 'total' | null>(() => {
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);
  if (p > 0 && l > 0 && lastEditedField.value !== 'total') return 'total';
  if (t > 0 && p > 0 && lastEditedField.value === 'total') return 'liters';
  if (t > 0 && l > 0 && lastEditedField.value === 'total' && !p) return 'price';
  return null;
});

const fuelOptions: { id: FuelId; label: string }[] = [
  { id: 'g95_e5', label: 'Gasolina 95 E5' },
  { id: 'diesel_a', label: 'Gasóleo A' },
  { id: 'g98_e5', label: 'Gasolina 98 E5' },
  { id: 'diesel_premium', label: 'Gasóleo Premium' },
  { id: 'glp', label: 'GLP' },
  { id: 'gnc', label: 'GNC' },
  { id: 'electric_kwh', label: 'Electricidad (kWh)' },
  { id: 'hydrogen_kg', label: 'Hidrógeno (H2/kg)' },
];

const priceUnitLabel = computed(() => {
  if (fuelType.value === 'electric_kwh') return '€/kWh';
  if (fuelType.value === 'hydrogen_kg') return '€/kg';
  return '€/L';
});

const quantityUnitLabel = computed(() => {
  if (fuelType.value === 'electric_kwh') return 'kWh';
  if (fuelType.value === 'hydrogen_kg') return 'kg';
  return 'Litros (L)';
});

// Optional Receipt / Ticket Image
const receiptImage = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const previewModalImage = ref<string | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleReceiptFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const img = new window.Image();
    img.onload = () => {
      const maxDim = 1000;
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        receiptImage.value = canvas.toDataURL('image/jpeg', 0.75);
      }
    };
    img.src = loadEvent.target?.result as string;
  };
  reader.readAsDataURL(file);
  target.value = '';
};

const removeReceiptImage = () => {
  receiptImage.value = null;
};

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

const availableYears = computed(() => {
  const years = new Set<number>();
  years.add(new Date().getFullYear());
  logs.value.forEach((l) => {
    const y = new Date(l.date).getFullYear();
    if (!isNaN(y)) years.add(y);
  });
  return Array.from(years).sort((a, b) => b - a);
});

const availableVehicleFilterOptions = computed(() => {
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'Todos los vehículos' }];
  vehicles.value.forEach((v) => {
    options.push({ value: v.id, label: `${v.alias} (${v.plate})` });
  });
  return options;
});

const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    if (filterVehicle.value !== 'all') {
      if (log.vehicleId !== filterVehicle.value) return false;
    }
    if (filterTrimester.value !== 'all') {
      const d = new Date(log.date);
      if (d.getFullYear() !== filterYear.value) return false;
      const m = d.getMonth();
      if (filterTrimester.value === '1T' && (m < 0 || m > 2)) return false;
      if (filterTrimester.value === '2T' && (m < 3 || m > 5)) return false;
      if (filterTrimester.value === '3T' && (m < 6 || m > 8)) return false;
      if (filterTrimester.value === '4T' && (m < 9 || m > 11)) return false;
    }
    return true;
  });
});

const displayedStats = computed(() => {
  let totalSpent = 0;
  let totalSavings = 0;
  let totalLiters = 0;
  filteredLogs.value.forEach((l) => {
    totalSpent += l.totalAmount;
    totalSavings += l.savingsEur || 0;
    totalLiters += l.liters;
  });
  const avgPricePerLiter = totalLiters > 0 ? totalSpent / totalLiters : 0;
  return { totalSpent, totalSavings, totalLiters, avgPricePerLiter };
});

const exportCsv = () => {
  const headers = [
    'Fecha',
    'Gasolinera',
    'Direccion',
    'Vehiculo',
    'Matricula',
    'Combustible',
    'Litros',
    'Precio_Litro',
    'Base_Imponible_EUR',
    'IVA_21_EUR',
    'Total_EUR',
    'NIF_CIF',
    'Razon_Social',
  ];

  const rows = filteredLogs.value.map((item) => {
    const base = (item.totalAmount / 1.21).toFixed(2);
    const iva = (item.totalAmount - item.totalAmount / 1.21).toFixed(2);
    return [
      `"${new Date(item.date).toISOString().slice(0, 10)}"`,
      `"${(item.stationName || '').replace(/"/g, '""')}"`,
      `"${(item.stationAddress || '').replace(/"/g, '""')}"`,
      `"${(item.vehicleAlias || '').replace(/"/g, '""')}"`,
      `"${(item.vehiclePlate || '').replace(/"/g, '""')}"`,
      `"${item.fuelType}"`,
      item.liters.toFixed(2),
      item.pricePerLiter.toFixed(3),
      base,
      iva,
      item.totalAmount.toFixed(2),
      `"${(settings.value.fiscalNif || '').replace(/"/g, '""')}"`,
      `"${(settings.value.fiscalName || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const suffix = filterTrimester.value !== 'all' ? `_${filterYear.value}_${filterTrimester.value}` : '';
  link.setAttribute('download', `repostajes_llenoporfa${suffix}_gestoria.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const printReport = () => {
  window.print();
};

const openNewRefuelForm = () => {
  editingLogId.value = null;
  selectedVehicleId.value = activeVehicle.value?.id || '';
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
  receiptImage.value = null;

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
  selectedVehicleId.value = item.vehicleId || '';
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
  receiptImage.value = item.receiptImage ?? null;
  isFormOpen.value = true;
};

const handleSave = () => {
  const p = Number(pricePerLiter.value);
  const l = Number(liters.value);
  const t = Number(totalAmount.value);

  if (!stationName.value.trim() || p <= 0 || l <= 0 || t <= 0) {
    alert('Completa al menos la gasolinera, el precio y los litros o total.');
    return;
  }

  const avgP = prefillAvgPrice.value || stationsStats.value.avgPrice;
  const calculatedSavings =
    avgP && avgP > p ? Math.round((avgP - p) * l * 100) / 100 : undefined;

  const chosenVeh = vehicles.value.find((v) => v.id === selectedVehicleId.value);

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
    vehicleId: chosenVeh?.id,
    vehicleAlias: chosenVeh?.alias,
    vehiclePlate: chosenVeh?.plate,
    receiptImage: receiptImage.value || undefined,
  };

  if (editingLogId.value) {
    updateLog(editingLogId.value, payload);
  } else {
    addLog(payload);
  }
  evaluate();

  // Track telemetry
  trackEvent('refuel_logged', {
    station_id: stationId.value,
    station_brand: stationName.value.trim(),
    fuel_type: fuelType.value,
    metadata: {
      liters: l,
      total: t,
      savings: calculatedSavings,
      vehicle_plate: chosenVeh?.plate,
    },
  });

  // Prompt voluntary support if savings exceed 1.00 €
  if (calculatedSavings && calculatedSavings >= 1.0) {
    savedAmountPrompt.value = calculatedSavings;
    showSupportModal.value = true;
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
        <Euro :size="20" class="stat-icon" />
        <div class="stat-data">
          <span class="label">Gasto Total</span>
          <strong class="val tabular-nums">{{ displayedStats.totalSpent.toFixed(2) }} €</strong>
        </div>
      </div>

      <div class="stat-card">
        <TrendingDown :size="20" class="stat-icon savings" />
        <div class="stat-data">
          <span class="label">Ahorro Estimado</span>
          <strong class="val highlight tabular-nums">{{ displayedStats.totalSavings.toFixed(2) }} €</strong>
        </div>
      </div>

      <div class="stat-card">
        <Droplet :size="20" class="stat-icon" />
        <div class="stat-data">
          <span class="label">Litros Totales</span>
          <strong class="val tabular-nums">{{ displayedStats.totalLiters.toFixed(1) }} L</strong>
        </div>
      </div>

      <div class="stat-card">
        <TrendingUp :size="20" class="stat-icon" />
        <div class="stat-data">
          <span class="label">Precio Medio</span>
          <strong class="val tabular-nums">
            {{ displayedStats.avgPricePerLiter > 0 ? displayedStats.avgPricePerLiter.toFixed(3) : '---' }} €/L
          </strong>
        </div>
      </div>
    </div>

    <!-- Filters & Accounting Export Toolbar -->
    <div class="filters-toolbar">
      <div class="filter-controls">
        <!-- Vehicle filter -->
        <div class="toolbar-select-wrap">
          <Car :size="15" class="select-icon" />
          <select v-model="filterVehicle" class="toolbar-select">
            <option
              v-for="opt in availableVehicleFilterOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Trimester filter -->
        <div class="toolbar-select-wrap">
          <Calendar :size="15" class="select-icon" />
          <select v-model="filterTrimester" class="toolbar-select">
            <option value="all">Todo el histórico</option>
            <option value="1T">1T (Ene - Mar)</option>
            <option value="2T">2T (Abr - Jun)</option>
            <option value="3T">3T (Jul - Sep)</option>
            <option value="4T">4T (Oct - Dic)</option>
          </select>
        </div>

        <!-- Year selector (visible if trimester selected) -->
        <div v-if="filterTrimester !== 'all'" class="toolbar-select-wrap year-select">
          <select v-model.number="filterYear" class="toolbar-select">
            <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>

      <div class="export-actions">
        <button class="export-btn" @click="exportCsv" title="Exportar CSV con Base Imponible e IVA 21%">
          <Download :size="15" />
          <span>Gestoría (.csv)</span>
        </button>
        <button class="export-btn secondary" @click="printReport" title="Imprimir informe o guardar PDF">
          <Printer :size="15" />
          <span>Imprimir / PDF</span>
        </button>
      </div>
    </div>

    <!-- New / Edit Form Modal -->
    <Teleport to="body">
      <div v-if="isFormOpen" class="modal-backdrop" @click.self="isFormOpen = false">
        <div class="detail-sheet form-sheet">
          <!-- Mobile Drag Handle -->
          <div class="bottom-sheet-handle"></div>

          <!-- Pinned Header matching StationDetailModal -->
          <div class="sheet-header">
            <div class="header-main">
              <div class="brand-row">
                <ReceiptText :size="18" class="text-primary" />
                <h3 class="sheet-title">{{ editingLogId ? 'Editar Repostaje' : 'Registrar Nuevo Repostaje' }}</h3>
              </div>
              <p class="sheet-subtitle">Introduce los datos del repostaje para controlar gastos y medias.</p>
            </div>
            <div class="header-actions">
              <button class="action-btn close-btn" @click="isFormOpen = false" aria-label="Cerrar">
                <X :size="18" />
              </button>
            </div>
          </div>

          <!-- Scrollable Sheet Content -->
          <div class="sheet-content">
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
                    <small v-if="st.selected_fuel_price" class="tabular-nums">{{ st.selected_fuel_price.toFixed(3) }}€</small>
                  </button>
                </div>
              </div>

              <!-- Vehicle Selector from Mis Vehículos in Ajustes -->
              <div class="form-group">
                <label class="field-label">Vehículo asignado (opcional)</label>
                <div v-if="vehicles.length > 0" class="input-icon-wrap">
                  <Car :size="16" class="field-icon" />
                  <select v-model="selectedVehicleId" class="form-select">
                    <option value="">(Sin vehículo asignado)</option>
                    <option v-for="v in vehicles" :key="v.id" :value="v.id">
                      {{ v.alias }} — {{ v.brand }} {{ v.model }} ({{ v.plate }})
                    </option>
                  </select>
                </div>
                <div v-else class="vehicle-empty-notice">
                  <Car :size="15" class="text-muted" />
                  <span>Sin vehículos registrados. Puedes añadirlos en <strong>Ajustes > Mis Vehículos</strong>.</span>
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
                  <span>Cálculo automático: completa 2 campos para calcular automáticamente el tercero</span>
                </div>

                <div class="calc-grid">
                  <div class="form-group">
                    <label class="field-label">Precio ({{ priceUnitLabel }})*</label>
                    <input
                      v-model.number="pricePerLiter"
                      type="number"
                      step="0.001"
                      min="0.01"
                      required
                      placeholder="1.629"
                      class="form-input font-mono tabular-nums"
                      :class="{ 'is-calculated': calculatedField === 'price' }"
                      @input="onPriceInput"
                    />
                  </div>

                  <div class="form-group">
                    <label class="field-label">Cantidad ({{ quantityUnitLabel }})*</label>
                    <input
                      v-model.number="liters"
                      type="number"
                      step="0.01"
                      min="0.1"
                      required
                      placeholder="45.5"
                      class="form-input font-mono tabular-nums"
                      :class="{ 'is-calculated': calculatedField === 'liters' }"
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
                      class="form-input font-mono tabular-nums total-input"
                      :class="{ 'is-calculated': calculatedField === 'total' }"
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

              <!-- Ticket / Receipt Image (Optional) -->
              <div class="form-group">
                <label class="field-label">Imagen del ticket (opcional)</label>
                <div class="receipt-upload-container">
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden-file-input"
                    @change="handleReceiptFile"
                  />

                  <div v-if="!receiptImage" class="receipt-dropzone" @click="triggerFileInput">
                    <Camera :size="20" class="dropzone-icon" />
                    <span class="dropzone-text">Hacer foto o subir imagen del ticket</span>
                    <span class="dropzone-hint">JPG, PNG hasta 5MB (se optimizará automáticamente)</span>
                  </div>

                  <div v-else class="receipt-preview-card">
                    <div class="preview-img-box" @click="previewModalImage = receiptImage">
                      <img :src="receiptImage" alt="Ticket" class="preview-thumb" />
                      <div class="preview-overlay">
                        <Eye :size="16" />
                      </div>
                    </div>
                    <div class="preview-info">
                      <span class="info-title">Ticket adjunto</span>
                      <span class="info-sub">Guardado localmente con el repostaje</span>
                    </div>
                    <div class="preview-actions">
                      <button type="button" class="action-mini-btn" @click="triggerFileInput" title="Cambiar foto">
                        <Camera :size="14" />
                      </button>
                      <button type="button" class="action-mini-btn danger" @click="removeReceiptImage" title="Quitar ticket">
                        <Trash2 :size="14" />
                      </button>
                    </div>
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
      </div>
    </Teleport>

  <!-- Empty State -->
    <div v-if="filteredLogs.length === 0" class="empty-state">
      <ReceiptText :size="48" class="empty-icon" />
      <h3 v-if="logs.length === 0">No tienes repostajes registrados</h3>
      <h3 v-else>No hay repostajes con los filtros seleccionados</h3>
      <p v-if="logs.length === 0">Registra tu primer repostaje pulsando en "Nuevo Repostaje" o directamente desde el detalle de cualquier gasolinera.</p>
      <p v-else>Prueba a cambiar el trimestre o el vehículo en la barra superior.</p>
      <button v-if="logs.length === 0" class="empty-action-btn" @click="openNewRefuelForm">
        <Plus :size="16" />
        <span>Añadir primer repostaje</span>
      </button>
    </div>

    <!-- Chronological Refuel History List -->
    <div v-else class="logs-list">
      <article v-for="item in filteredLogs" :key="item.id" class="refuel-card">
        <div class="card-left">
          <div class="station-meta">
            <h4 class="card-station-name">{{ item.stationName }}</h4>
            <span class="card-date">{{ new Date(item.date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) }}</span>
          </div>

          <div class="badge-row">
            <span v-if="item.vehicleAlias" class="pill-vehicle">
              <Car :size="11" />
              <span>{{ item.vehicleAlias }}{{ item.vehiclePlate ? ` (${item.vehiclePlate})` : '' }}</span>
            </span>
            <span class="pill-fuel">{{ item.fuelType.toUpperCase() }}</span>
            <span class="pill-data tabular-nums">{{ item.pricePerLiter.toFixed(3) }} €/L</span>
            <span class="pill-data tabular-nums">{{ item.liters.toFixed(2) }} L</span>
            <span v-if="item.savingsEur && item.savingsEur > 0" class="pill-savings tabular-nums">
              <span>Ahorro: ~{{ item.savingsEur.toFixed(2) }} €</span>
            </span>
            <span v-if="item.odometerKm" class="pill-km tabular-nums">{{ item.odometerKm.toLocaleString() }} km</span>
            <button
              v-if="item.receiptImage"
              type="button"
              class="pill-ticket"
              @click.stop="previewModalImage = item.receiptImage"
              title="Ver imagen del ticket"
            >
              <Camera :size="11" />
              <span>Ticket</span>
            </button>
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

    <!-- Voluntary Support Modal on high savings -->
    <Teleport to="body">
      <div v-if="showSupportModal" class="modal-backdrop" @click.self="showSupportModal = false">
        <div class="support-modal-card">
          <div class="support-icon">☕</div>
          <h3>¡Ahorraste {{ savedAmountPrompt.toFixed(2) }} € en este repostaje!</h3>
          <p>
            LlenoPorfa es un proyecto independiente y gratuito para ayudarte a pagar lo mínimo en cada repostaje.
            Si la app te ayuda a ahorrar mes a mes, puedes colaborar voluntariamente para mantener los servidores activos.
          </p>
          <div class="support-actions">
            <a
              :href="supportUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="support-btn-primary"
              @click="showSupportModal = false"
            >
              <Heart :size="16" />
              <span>Invitar a un café</span>
            </a>
            <button class="support-btn-secondary" @click="showSupportModal = false">
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Fullscreen Ticket Image Preview Modal -->
    <Teleport to="body">
      <div
        v-if="previewModalImage"
        class="modal-backdrop image-preview-backdrop"
        @click="previewModalImage = null"
      >
        <div class="image-preview-dialog" @click.stop>
          <div class="image-preview-header">
            <span class="preview-title">Ticket de repostaje</span>
            <button class="action-btn close-btn" @click="previewModalImage = null" aria-label="Cerrar">
              <X :size="18" />
            </button>
          </div>
          <div class="image-preview-body">
            <img :src="previewModalImage" alt="Ticket" class="full-ticket-img" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Screen Hidden Printable Report for @media print -->
    <div class="print-report-container">
      <div class="print-header">
        <h2>LlenoPorfa — Informe de Repostajes para Contabilidad / Gestoría</h2>
        <div class="print-meta-grid">
          <div v-if="settings.fiscalName"><strong>Razón Social:</strong> {{ settings.fiscalName }}</div>
          <div v-if="settings.fiscalNif"><strong>CIF / NIF:</strong> {{ settings.fiscalNif }}</div>
          <div><strong>Período:</strong> {{ filterTrimester === 'all' ? 'Todo el histórico' : `${filterTrimester} ${filterYear}` }}</div>
          <div><strong>Fecha Emisión:</strong> {{ new Date().toLocaleDateString('es-ES') }}</div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Gasolinera</th>
            <th>Vehículo</th>
            <th>Carburante</th>
            <th>Litros</th>
            <th>€/Litro</th>
            <th>Base Imponible</th>
            <th>IVA (21%)</th>
            <th>Total (€)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in filteredLogs" :key="l.id">
            <td>{{ new Date(l.date).toLocaleDateString('es-ES') }}</td>
            <td>{{ l.stationName }}</td>
            <td>{{ l.vehicleAlias ? `${l.vehicleAlias}${l.vehiclePlate ? ` (${l.vehiclePlate})` : ''}` : '-' }}</td>
            <td>{{ l.fuelType }}</td>
            <td>{{ l.liters.toFixed(2) }} L</td>
            <td>{{ l.pricePerLiter.toFixed(3) }} €</td>
            <td>{{ (l.totalAmount / 1.21).toFixed(2) }} €</td>
            <td>{{ (l.totalAmount - l.totalAmount / 1.21).toFixed(2) }} €</td>
            <td><strong>{{ l.totalAmount.toFixed(2) }} €</strong></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th colspan="4">Totales Período</th>
            <th>{{ displayedStats.totalLiters.toFixed(2) }} L</th>
            <th>-</th>
            <th>{{ (displayedStats.totalSpent / 1.21).toFixed(2) }} €</th>
            <th>{{ (displayedStats.totalSpent - displayedStats.totalSpent / 1.21).toFixed(2) }} €</th>
            <th>{{ displayedStats.totalSpent.toFixed(2) }} €</th>
          </tr>
        </tfoot>
      </table>
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

  @include mobile {
    padding-bottom: calc(36px + var(--bottom-nav-height) + var(--safe-bottom) + 72px);
  }
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
    background: var(--btn-cta-bg);
    color: var(--btn-cta-text);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 600;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }
  }

  @include mobile {
    .add-btn {
      position: fixed;
      right: 16px;
      bottom: calc(var(--bottom-nav-height) + var(--safe-bottom) + 16px);
      z-index: 70;
      min-height: 48px;
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-md);
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
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;

    .stat-icon {
      flex-shrink: 0;
      color: var(--text-muted);

      &.savings {
        color: var(--savings-green);
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
        font-weight: 800;
        font-family: var(--font-mono);
        color: var(--text-main);

        &.highlight {
          color: var(--savings-green);
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
    padding: 10px 18px;
    background: var(--btn-cta-bg);
    color: var(--btn-cta-text);
    font-weight: 600;
    font-size: 0.85rem;
    border-radius: var(--radius-md);
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }
  }
}

// Modal Form Styles
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @include desktop {
    align-items: center;
    padding: 24px;
  }
}

.detail-sheet.form-sheet {
  background: var(--bg-surface);
  width: 100%;
  max-width: 640px;
  max-height: 92dvh;
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @include desktop {
    border-radius: var(--radius-xl);
    max-height: 88dvh;
  }
}

.bottom-sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(161, 161, 170, 0.4);
  border-radius: 9999px;
  margin: 10px auto 4px;
  flex-shrink: 0;
  display: block;

  @include desktop {
    display: none;
  }
}

.sheet-header {
  padding: 12px 18px 14px;
  border-bottom: 1px solid var(--border-color);
  @include flex-between;
  align-items: center;
  background: var(--bg-surface);
  flex-shrink: 0;
  z-index: 10;
  gap: 12px;

  .header-main {
    flex: 1;
    min-width: 0;

    .brand-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .text-primary {
        color: var(--color-primary);
      }

      .sheet-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-main);
        margin: 0;
      }
    }

    .sheet-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2px;
      @include truncate;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;

    .action-btn {
      width: 34px;
      height: 34px;
      min-width: 34px;
      min-height: 34px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      @include flex-center;
      cursor: pointer;
      transition: color var(--transition-fast), background-color var(--transition-fast);

      &:hover {
        color: var(--text-main);
        background: var(--border-color);
      }
    }
  }
}

.sheet-content {
  overflow-y: auto;
  padding: 16px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  -webkit-overflow-scrolling: touch;
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

.vehicle-empty-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-surface-subtle);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.775rem;
  color: var(--text-muted);

  strong {
    color: var(--text-main);
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
  transition: border-color var(--transition-fast);

  &:focus {
    border-color: var(--border-focus);
  }

  &.font-mono {
    font-family: var(--font-mono);
    font-weight: 600;
  }

  &.is-calculated {
    color: var(--savings-green) !important;
    border-color: var(--savings-border) !important;
    background: var(--savings-bg) !important;
    font-weight: 700 !important;
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
    font-weight: 600;
    color: var(--text-muted);
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
    color: var(--text-main);
    font-size: 1rem;
    font-weight: 700;
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
      transition: border-color var(--transition-fast), background-color var(--transition-fast);

      small {
        color: var(--text-muted);
        font-weight: 600;
      }

      &:hover {
        border-color: var(--border-focus);
      }

      &.active {
        background: var(--btn-cta-bg);
        border-color: var(--btn-cta-bg);
        color: var(--btn-cta-text);

        small {
          color: var(--savings-green);
        }
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
    padding: 10px 18px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-main);
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    transition: background-color var(--transition-fast);
    &:hover {
      background: var(--border-color);
    }
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: var(--radius-md);
    background: var(--btn-cta-bg);
    color: var(--btn-cta-text);
    font-weight: 600;
    font-size: 0.875rem;
    transition: opacity var(--transition-fast);

    &:hover {
      opacity: 0.9;
    }
  }
}

.receipt-upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .hidden-file-input {
    display: none;
  }

  .receipt-dropzone {
    border: 1.5px dashed var(--border-color);
    background: var(--bg-surface-subtle);
    border-radius: var(--radius-md);
    padding: 16px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: border-color var(--transition-fast), background-color var(--transition-fast);

    &:hover {
      border-color: var(--border-focus);
      background: var(--bg-input);
    }

    .dropzone-icon {
      color: var(--text-muted);
    }

    .dropzone-text {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .dropzone-hint {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
  }

  .receipt-preview-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);

    .preview-img-box {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      cursor: pointer;
      flex-shrink: 0;
      border: 1px solid var(--border-color);

      .preview-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .preview-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        color: #ffffff;
        @include flex-center;
        opacity: 0;
        transition: opacity var(--transition-fast);
      }

      &:hover .preview-overlay {
        opacity: 1;
      }
    }

    .preview-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;

      .info-title {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--text-main);
      }

      .info-sub {
        font-size: 0.7rem;
        color: var(--text-muted);
      }
    }

    .preview-actions {
      display: flex;
      align-items: center;
      gap: 6px;

      .action-mini-btn {
        width: 32px;
        height: 32px;
        border-radius: var(--radius-md);
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        color: var(--text-muted);
        @include flex-center;
        cursor: pointer;
        transition: all var(--transition-fast);

        &:hover {
          color: var(--text-main);
          border-color: var(--border-focus);
        }

        &.danger:hover {
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.4);
          background: rgba(239, 68, 68, 0.1);
        }
      }
    }
  }
}

.pill-ticket {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-color);
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    color: var(--text-main);
    border-color: var(--border-focus);
  }
}

.image-preview-backdrop {
  z-index: 1000;
}

.image-preview-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .image-preview-header {
    @include flex-between;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-color);

    .preview-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-full);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      @include flex-center;
      cursor: pointer;
      &:hover {
        color: var(--text-main);
      }
    }
  }

  .image-preview-body {
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 80vh;
    overflow: auto;

    .full-ticket-img {
      max-width: 100%;
      max-height: 75vh;
      object-fit: contain;
      border-radius: var(--radius-sm);
    }
  }
}

.filters-toolbar {
  @include flex-between;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 14px;

  .filter-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-select-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;

    .select-icon {
      position: absolute;
      left: 10px;
      color: var(--text-muted);
      pointer-events: none;
    }

    .toolbar-select {
      appearance: none;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-main);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 6px 28px 6px 30px;
      cursor: pointer;
      min-height: 34px;

      &:focus {
        border-color: var(--color-primary);
        outline: none;
      }
    }

    &.year-select .toolbar-select {
      padding-left: 12px;
    }
  }

  .export-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 0.775rem;
      font-weight: 700;
      background: var(--color-primary);
      color: #ffffff;
      min-height: 34px;
      transition: all var(--transition-fast);

      &:hover {
        background: var(--color-primary-dark);
      }

      &.secondary {
        background: var(--bg-surface-subtle);
        border: 1px solid var(--border-color);
        color: var(--text-main);

        &:hover {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
          color: var(--color-primary-dark);
        }
      }
    }
  }
}

.pill-vehicle {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  font-size: 0.725rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 4px;

  [data-theme="dark"] & {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
  }
}

.support-modal-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 440px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  animation: modalPop 0.25s ease-out;

  .support-icon {
    font-size: 2.5rem;
    line-height: 1;
  }

  h3 {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-main);
  }

  p {
    font-size: 0.825rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .support-actions {
    display: flex;
    gap: 10px;
    width: 100%;
    margin-top: 8px;

    .support-btn-primary {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 14px;
      background: #f59e0b;
      color: #ffffff;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s ease;

      &:hover {
        background: #d97706;
      }
    }

    .support-btn-secondary {
      padding: 10px 14px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;

      &:hover {
        color: var(--text-main);
      }
    }
  }
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.print-report-container {
  display: none;
}

@media print {
  body * {
    visibility: hidden;
  }

  .print-report-container,
  .print-report-container * {
    visibility: visible;
  }

  .print-report-container {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    color: #000000;
    background: #ffffff;
    padding: 20px;

    .print-header {
      margin-bottom: 24px;
      border-bottom: 2px solid #000000;
      padding-bottom: 12px;

      h2 {
        font-size: 16pt;
        margin-bottom: 12px;
      }

      .print-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        font-size: 9pt;
      }
    }

    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;

      th, td {
        border: 1px solid #cccccc;
        padding: 6px 8px;
        text-align: left;
      }

      th {
        background: #f3f4f6;
        font-weight: bold;
      }

      tfoot th {
        background: #e5e7eb;
        font-weight: bold;
      }
    }
  }
}
</style>
