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
  Coffee,
  ChevronDown,
  Wrench,
} from 'lucide-vue-next';
import { useSettings } from '../composables/useSettings';
import { usePwaInstall } from '../composables/usePwaInstall';
import { useNativeRadar } from '../composables/useNativeRadar';
import { useHaptics } from '../composables/useHaptics';
import type { FuelId, MaintenanceKind, MaintenanceRule, Vehicle } from '../types';
import { useMaintenance } from '../composables/useMaintenance';
import { useRefuelLogs } from '../composables/useRefuelLogs';
import { formatKilometers, parseKilometers } from '../utils/numberFormat';

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
const { alerts, activeAlerts, saveRule, deleteRule, completeRule, snoozeRule } = useMaintenance();
const { logs } = useRefuelLogs();

const isMaintenanceModalOpen = ref(false);
const editingRuleId = ref<string | null>(null);
const maintenanceTitle = ref('');
const maintenanceTitlePreset = ref<MaintenanceTitlePreset>('');
const maintenanceVehicleId = ref('');
const maintenanceStartDate = ref(new Date().toISOString().slice(0, 10));
const maintenanceStartKm = ref<number | ''>('');
const maintenanceDateInterval = ref<MaintenanceDateInterval>('');
const maintenanceCustomDate = ref('');
const maintenanceKmPreset = ref<MaintenanceKmPreset>('');
const maintenanceKmCustom = ref<number | ''>('');
const maintenanceKmUsesTarget = ref(false);
const maintenanceKind = ref<MaintenanceKind>('review');

const maintenanceKindOptions: { id: MaintenanceKind; label: string }[] = [
  { id: 'change', label: 'Cambio' },
  { id: 'review', label: 'Revisión' },
  { id: 'itv', label: 'ITV' },
  { id: 'tyres', label: 'Neumáticos' },
  { id: 'brakes', label: 'Frenos' },
  { id: 'battery', label: 'Batería' },
  { id: 'documentation', label: 'Documentación' },
  { id: 'other', label: 'Otro' },
];

const maintenanceTitleOptions = [
  { id: 'oil_change', label: 'Cambio de aceite' },
  { id: 'filter_change', label: 'Cambio de filtros' },
  { id: 'general_review', label: 'Revisión general' },
  { id: 'itv', label: 'ITV' },
  { id: 'tyres', label: 'Cambio de neumáticos' },
  { id: 'brakes', label: 'Revisión de frenos' },
  { id: 'battery', label: 'Sustitución de batería' },
  { id: 'timing_belt', label: 'Correa de distribución' },
  { id: 'fluids', label: 'Revisión de niveles' },
  { id: 'custom', label: 'Personalizado' },
] as const;
type MaintenanceTitlePreset = '' | (typeof maintenanceTitleOptions)[number]['id'];

const maintenanceDateOptions = [
  { id: '15_days', label: '15 días', days: 15 },
  { id: '1_month', label: '1 mes', months: 1 },
  { id: '3_months', label: '3 meses', months: 3 },
  { id: '6_months', label: '6 meses', months: 6 },
  { id: '1_year', label: '1 año', months: 12 },
  { id: '2_years', label: '2 años', months: 24 },
  { id: 'custom', label: 'Personalizado' },
] as const;
type MaintenanceDateInterval = '' | (typeof maintenanceDateOptions)[number]['id'];

const maintenanceKmOptions = [
  { id: '500', label: '+ 500 km' },
  { id: '1000', label: '+ 1.000 km' },
  { id: '2000', label: '+ 2.000 km' },
  { id: '5000', label: '+ 5.000 km' },
  { id: '10000', label: '+ 10.000 km' },
  { id: '15000', label: '+ 15.000 km' },
  { id: '20000', label: '+ 20.000 km' },
  { id: '30000', label: '+ 30.000 km' },
  { id: '50000', label: '+ 50.000 km' },
  { id: 'custom', label: 'Personalizado' },
] as const;
type MaintenanceKmPreset = '' | (typeof maintenanceKmOptions)[number]['id'];

const normalizeMaintenanceKind = (kind?: MaintenanceKind): MaintenanceKind => {
  if (kind === 'oil') return 'change';
  if (kind === 'inspection') return 'review';
  if (kind === 'custom') return 'other';
  return maintenanceKindOptions.some((option) => option.id === kind) ? kind : 'review';
};

const handleMaintenanceTitleChange = () => {
  const option = maintenanceTitleOptions.find((item) => item.id === maintenanceTitlePreset.value);
  maintenanceTitle.value = option?.id === 'custom' ? '' : option?.label || '';
};

const handleMaintenanceKmChange = () => {
  if (maintenanceKmPreset.value !== 'custom') {
    maintenanceKmCustom.value = '';
    maintenanceKmUsesTarget.value = false;
  }
};

const handleMaintenanceStartKmInput = (event: Event) => {
  maintenanceStartKm.value = parseKilometers((event.target as HTMLInputElement).value);
};

const handleMaintenanceKmCustomValueInput = (event: Event) => {
  maintenanceKmCustom.value = parseKilometers((event.target as HTMLInputElement).value);
  maintenanceKmUsesTarget.value = false;
};

const openMaintenance = (vehicle?: Vehicle, existing?: MaintenanceRule) => {
  editingRuleId.value = existing?.id || null;
  maintenanceTitle.value = existing?.title || '';
  const titleOption = maintenanceTitleOptions.find((item) => item.id !== 'custom' && item.label === existing?.title);
  maintenanceTitlePreset.value = titleOption?.id || (existing ? 'custom' : '');
  maintenanceVehicleId.value = existing?.vehicleId || vehicle?.id || activeVehicle.value?.id || vehicles.value[0]?.id || '';
  maintenanceStartDate.value = existing?.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const latestKm = logs.value.filter((log) => log.vehicleId === maintenanceVehicleId.value && typeof log.odometerKm === 'number').reduce((max, log) => Math.max(max, log.odometerKm as number), 0);
  maintenanceStartKm.value = existing?.startOdometerKm ?? (latestKm || '');
  const dateOption = maintenanceDateOptions.find(
    (option) => option.id !== 'custom' && (option.days === existing?.intervalDays || option.months === existing?.intervalMonths)
  );
  maintenanceDateInterval.value = existing?.customDueDate ? 'custom' : dateOption?.id || '';
  maintenanceCustomDate.value = existing?.customDueDate?.slice(0, 10) || '';
  const kmOption = maintenanceKmOptions.find((option) => Number(option.id) === existing?.intervalKm);
  maintenanceKmUsesTarget.value = existing?.targetOdometerKm != null && existing?.intervalKm == null;
  maintenanceKmPreset.value = kmOption?.id || (existing?.intervalKm != null || maintenanceKmUsesTarget.value ? 'custom' : '');
  maintenanceKmCustom.value = maintenanceKmPreset.value === 'custom'
    ? existing?.targetOdometerKm ?? existing?.intervalKm ?? ''
    : '';
  maintenanceKind.value = normalizeMaintenanceKind(existing?.kind);
  isMaintenanceModalOpen.value = true;
};

const handleSaveMaintenance = () => {
  if (!maintenanceTitle.value.trim() || !maintenanceVehicleId.value) return;
  const existing = vehicles.value
    .flatMap((item) => item.maintenanceRules || [])
    .find((rule) => rule.id === editingRuleId.value);
  const selectedDateOption = maintenanceDateOptions.find((option) => option.id === maintenanceDateInterval.value);
  const customDueDate = maintenanceDateInterval.value === 'custom' && maintenanceCustomDate.value
    ? new Date(`${maintenanceCustomDate.value}T00:00:00`)
    : undefined;
  if (maintenanceDateInterval.value === 'custom' && (!customDueDate || Number.isNaN(customDueDate.getTime()))) return;

  const selectedKm = maintenanceKmPreset.value === 'custom'
    ? maintenanceKmCustom.value === '' ? undefined : Number(maintenanceKmCustom.value)
    : maintenanceKmPreset.value ? Number(maintenanceKmPreset.value) : undefined;
  const preservesTargetOdometer = maintenanceKmUsesTarget.value && existing?.targetOdometerKm != null;
  const rule: MaintenanceRule = {
    ...(existing || {}),
    id: editingRuleId.value || `maint_${Date.now()}`,
    title: maintenanceTitle.value.trim(),
    vehicleId: maintenanceVehicleId.value,
    kind: maintenanceKind.value,
    startDate: new Date(`${maintenanceStartDate.value}T00:00:00`).toISOString(),
    startOdometerKm: maintenanceStartKm.value === '' ? undefined : Number(maintenanceStartKm.value),
    intervalDays: selectedDateOption?.days,
    intervalMonths: selectedDateOption?.months,
    customDueDate: customDueDate?.toISOString(),
    intervalKm: preservesTargetOdometer ? undefined : selectedKm,
    targetOdometerKm: preservesTargetOdometer ? selectedKm : undefined,
    enabled: existing?.enabled ?? true,
  };
  saveRule(rule);
  isMaintenanceModalOpen.value = false;
};

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
  { id: 'gnc', label: 'GNC' },
  { id: 'electric_kwh', label: 'Electricidad (kWh)' },
  { id: 'hydrogen_kg', label: 'Hidrógeno (H2/kg)' },
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
    alert('Completa al menos el nombre/alias y la matrícula.');
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
    <div class="settings-card radar-card" :class="{ 'active-radar': settings.nativeBackgroundRadar }">
      <div class="card-header-between">
        <div class="card-header-icon">
          <div class="icon-bubble" :class="{ active: settings.nativeBackgroundRadar }">
            <Radio :size="18" />
          </div>
          <div>
            <h3 class="card-title">Radar de Ahorro en Segundo Plano</h3>
            <div class="radar-status-badge" :class="{ active: settings.nativeBackgroundRadar }">
              <span class="status-dot"></span>
              <span>{{ settings.nativeBackgroundRadar ? 'Activo' : 'Desactivado' }}</span>
            </div>
          </div>
        </div>
        <button
          class="radar-switch"
          :class="{ active: settings.nativeBackgroundRadar }"
          @click="toggleBackgroundRadar"
          role="switch"
          :aria-checked="!!settings.nativeBackgroundRadar"
          :aria-label="settings.nativeBackgroundRadar ? 'Desactivar radar' : 'Activar radar'"
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

      <div class="fuel-select-wrap">
        <select
          :value="settings.defaultFuel"
          class="form-select settings-fuel-select"
          aria-label="Seleccionar combustible por defecto"
          @change="handleFuelChange(($event.target as HTMLSelectElement).value as FuelId)"
        >
          <option v-for="f in fuelOptions" :key="f.id" :value="f.id">
            {{ f.label }}
          </option>
        </select>
        <ChevronDown :size="16" class="select-chevron" />
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
      <p class="card-desc">Gestiona tus coches o motos para filtrar repostajes y vincular consumos.</p>

      <div v-if="vehicles.length === 0" class="vehicle-empty">
        <p>No tienes vehículos dados de alta. Puedes añadir tu coche habitual para facilitar los registros.</p>
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

    <div class="settings-card maintenance-card">
      <div class="card-header-between">
        <div class="card-header-icon">
          <Wrench :size="20" class="text-primary" />
          <h3 class="card-title">Mantenimiento</h3>
        </div>
        <button class="add-vehicle-btn" :disabled="!vehicles.length" @click="openMaintenance()">
          <Plus :size="16" /> <span>Añadir regla</span>
        </button>
      </div>
      <p class="card-desc">Controla aceite, ITV, neumáticos o cualquier revisión por fecha o kilometraje.</p>
      <div v-if="activeAlerts.length" class="maintenance-summary" role="status">
        <strong>{{ activeAlerts.length }} {{ activeAlerts.length === 1 ? 'aviso pendiente' : 'avisos pendientes' }}</strong>
        <span>La condición se activa por fecha o por km, lo primero que ocurra.</span>
      </div>
      <div v-if="!vehicles.length" class="vehicle-empty">Añade un vehículo para configurar sus revisiones.</div>
      <div v-for="vehicle in vehicles" :key="vehicle.id" class="maintenance-vehicle">
        <div class="maintenance-vehicle-header">
          <strong>{{ vehicle.alias }}</strong>
          <button class="text-action" @click="openMaintenance(vehicle)">Añadir</button>
        </div>
        <div v-if="!(vehicle.maintenanceRules || []).length" class="maintenance-empty">Sin reglas configuradas.</div>
        <div v-for="rule in vehicle.maintenanceRules || []" :key="rule.id" class="maintenance-row">
          <div>
            <strong>{{ rule.title }}</strong>
            <small v-if="alerts.find(a => a.rule.id === rule.id)">{{ alerts.find(a => a.rule.id === rule.id)?.reason === 'km' ? 'Por kilometraje' : alerts.find(a => a.rule.id === rule.id)?.reason === 'date' ? 'Por fecha' : 'Por fecha o km' }}</small>
            <small v-else>Configurada</small>
          </div>
          <div class="maintenance-actions">
            <button class="icon-btn" @click="openMaintenance(vehicle, rule)" title="Editar mantenimiento"><Edit2 :size="14" /></button>
            <button class="icon-btn" @click="completeRule(rule)" title="Marcar realizada"><Check :size="14" /></button>
            <button class="icon-btn" @click="snoozeRule(rule)" title="Posponer 7 días"><Bell :size="14" /></button>
            <button class="icon-btn delete" @click="deleteRule(rule)" title="Eliminar mantenimiento"><Trash2 :size="14" /></button>
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
        Si la herramienta te resulta de utilidad para ahorrar, puedes colaborar para cubrir los costes de hosting y dominios.
      </p>
      <a
        :href="supportUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="support-project-btn"
      >
        <Coffee :size="16" class="support-icon" />
        <span>Invitar a un café / Colaborar</span>
      </a>
    </div>

    <!-- Vehicle Modal -->
    <Teleport to="body">
      <div v-if="isVehicleModalOpen" class="modal-backdrop" @click.self="isVehicleModalOpen = false">
        <div class="detail-sheet vehicle-sheet">
          <!-- Mobile Drag Handle -->
          <div class="bottom-sheet-handle"></div>

          <!-- Pinned Header matching StationDetailModal -->
          <div class="sheet-header">
            <div class="header-main">
              <div class="brand-row">
                <Car :size="18" class="text-primary" />
                <h3 class="sheet-title">{{ editingVehicleId ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo' }}</h3>
              </div>
              <p class="sheet-subtitle">Configura los datos del vehículo para vincular consumos y repostajes.</p>
            </div>
            <div class="header-actions">
              <button class="action-btn close-btn" @click="isVehicleModalOpen = false" aria-label="Cerrar">
                <X :size="18" />
              </button>
            </div>
          </div>

          <!-- Scrollable Sheet Content -->
          <div class="sheet-content">
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

              <div class="form-actions">
                <button type="button" class="btn-secondary" @click="isVehicleModalOpen = false">Cancelar</button>
                <button type="submit" class="btn-primary">
                  <Check :size="16" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isMaintenanceModalOpen" class="modal-backdrop" @click.self="isMaintenanceModalOpen = false">
        <div class="detail-sheet vehicle-sheet">
           <div class="bottom-sheet-handle"></div>
           <div class="sheet-header"><div class="header-main"><div class="brand-row"><Wrench :size="18" class="text-primary" /><h3 class="sheet-title">{{ editingRuleId ? 'Editar mantenimiento' : 'Nueva regla de mantenimiento' }}</h3></div><p class="sheet-subtitle">Se avisa cuando vence la fecha o el kilometraje.</p></div><button class="action-btn close-btn" @click="isMaintenanceModalOpen = false" aria-label="Cerrar"><X :size="18" /></button></div>
           <div class="sheet-content"><form class="vehicle-form" @submit.prevent="handleSaveMaintenance">
             <div class="form-group">
               <label class="field-label" for="maintenance-kind">Tipo</label>
               <select id="maintenance-kind" v-model="maintenanceKind" required class="form-select">
                 <option v-for="option in maintenanceKindOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
               </select>
             </div>

             <div class="form-group">
               <label class="field-label" for="maintenance-title-select">Título</label>
               <select
                 id="maintenance-title-select"
                 v-model="maintenanceTitlePreset"
                 required
                 class="form-select"
                 @change="handleMaintenanceTitleChange"
               >
                 <option disabled value="">Selecciona un título</option>
                 <option v-for="option in maintenanceTitleOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
               </select>
               <input
                 v-if="maintenanceTitlePreset === 'custom'"
                 id="maintenance-title"
                 v-model="maintenanceTitle"
                 required
                 class="form-input"
                 placeholder="Escribe el título"
               />
             </div>

             <div class="form-group">
               <label class="field-label" for="maintenance-vehicle">Vehículo</label>
               <select id="maintenance-vehicle" v-model="maintenanceVehicleId" required class="form-select">
                 <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.alias }}</option>
               </select>
             </div>

             <div class="form-row">
               <div class="form-group flex-1">
                 <label class="field-label" for="maintenance-start">Fecha inicial</label>
                 <input id="maintenance-start" v-model="maintenanceStartDate" type="date" required class="form-input" />
               </div>
               <div class="form-group flex-1">
                 <label class="field-label" for="maintenance-start-km">Km inicial</label>
                 <input id="maintenance-start-km" :value="formatKilometers(maintenanceStartKm)" type="text" inputmode="numeric" class="form-input" placeholder="Último registrado" @input="handleMaintenanceStartKmInput" />
               </div>
             </div>

             <div class="form-group">
               <label class="field-label" for="maintenance-date-interval">Aviso por fecha</label>
               <select id="maintenance-date-interval" v-model="maintenanceDateInterval" class="form-select">
                 <option value="">Sin aviso por fecha</option>
                 <option v-for="option in maintenanceDateOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
               </select>
               <input
                 v-if="maintenanceDateInterval === 'custom'"
                 v-model="maintenanceCustomDate"
                 type="date"
                 required
                 class="form-input"
                 aria-label="Fecha personalizada de aviso"
               />
             </div>

             <div class="form-group">
               <label class="field-label" for="maintenance-km">Aviso por kilometraje</label>
               <select id="maintenance-km" v-model="maintenanceKmPreset" class="form-select" @change="handleMaintenanceKmChange">
                 <option value="">Sin aviso por kilometraje</option>
                 <option v-for="option in maintenanceKmOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
               </select>
               <input
                 v-if="maintenanceKmPreset === 'custom'"
                 :value="formatKilometers(maintenanceKmCustom)"
                 type="text"
                 inputmode="numeric"
                 class="form-input"
                 placeholder="Kilómetros adicionales"
                 aria-label="Kilómetros personalizados"
                 @input="handleMaintenanceKmCustomValueInput"
               />
             </div>

             <div class="form-actions"><button type="button" class="btn-secondary" @click="isMaintenanceModalOpen = false">Cancelar</button><button type="submit" class="btn-primary"><Check :size="16" /> Guardar</button></div>
           </form></div>
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
  background: var(--btn-cta-bg);
  color: var(--btn-cta-text);
  border-radius: var(--radius-md);
  font-weight: 700;
  font-size: 0.875rem;
  min-height: 44px;
  transition: opacity var(--transition-fast);

  &:hover {
    opacity: 0.9;
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

.fuel-select-wrap {
  position: relative;
  display: flex;
  align-items: center;

  .settings-fuel-select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding: 12px 40px 12px 14px;
    font-size: 0.95rem;
    font-weight: 600;
    min-height: 48px;
    background: var(--bg-surface-subtle);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-main);
    cursor: pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

    &:focus {
      border-color: var(--color-primary);
      outline: none;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
  }

  .select-chevron {
    position: absolute;
    right: 14px;
    pointer-events: none;
    color: var(--text-muted);
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
  gap: 16px;
  width: 100%;

  .card-header-icon {
    flex: 1 1 auto;
    min-width: 0;
  }
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

.maintenance-card {
  .maintenance-summary {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 10px 12px;
    border-left: 3px solid var(--color-primary);
    background: var(--bg-surface-subtle);
    font-size: 0.8rem;
    span { color: var(--text-muted); }
  }
  .maintenance-vehicle { border-top: 1px solid var(--border-color); padding-top: 10px; }
  .maintenance-vehicle-header, .maintenance-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .maintenance-row { padding: 10px 0; border-top: 1px solid var(--border-color); }
  .maintenance-row small, .maintenance-empty { display: block; color: var(--text-muted); font-size: 0.75rem; margin-top: 3px; }
  .maintenance-actions { display: flex; gap: 2px; }
  .text-action { color: var(--color-primary); font-size: 0.8rem; font-weight: 700; }
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

.detail-sheet.vehicle-sheet {
  background: var(--bg-surface);
  width: 100%;
  max-width: 560px;
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

.vehicle-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;

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
}

.radar-card {
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

  &.active-radar {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08);
  }
}

.icon-bubble {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface-subtle);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
  flex-shrink: 0;

  &.active {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border-color: rgba(16, 185, 129, 0.35);
  }
}

.radar-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-top: 2px;
  color: var(--text-muted);

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
    transition: background 0.25s ease;
  }

  &.active {
    color: #10b981;

    .status-dot {
      background: #10b981;
      box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
    }
  }
}

.radar-switch {
  position: relative;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  width: 52px !important;
  min-width: 52px !important;
  max-width: 52px !important;
  height: 30px !important;
  min-height: 30px !important;
  max-height: 30px !important;
  border-radius: 9999px !important;
  background: var(--bg-surface-subtle);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  padding: 2px 3px !important;
  outline: none;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0 !important;

  &:hover {
    border-color: rgba(16, 185, 129, 0.5);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35);
  }

  &.active {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-color: rgba(16, 185, 129, 0.6);
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.2);

    .switch-handle {
      transform: translateX(22px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.6);
    }
  }

  .switch-handle {
    display: block;
    width: 22px;
    height: 22px;
    min-width: 22px;
    min-height: 22px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.22), 0 1px 2px rgba(0, 0, 0, 0.12);
    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
    flex-shrink: 0;
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
