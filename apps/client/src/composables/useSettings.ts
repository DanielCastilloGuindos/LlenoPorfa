import { ref, computed, onMounted } from 'vue';
import type { UserSettings, Vehicle } from '../types';

const STORAGE_KEY = 'llenoporfa_settings_v1';

const defaultSettings: UserSettings = {
  defaultFuel: 'g95_e5',
  defaultRadius: 10,
  tankCapacityLiters: 50,
  theme: 'system',
  vehicles: [],
  activeVehicleId: undefined,
  fiscalName: '',
  fiscalNif: '',
};

const settings = ref<UserSettings>({ ...defaultSettings });

// Immediate load on script execution if window is available
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      settings.value = { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (_) {}
}

export function useSettings() {
  const loadSettings = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        settings.value = { ...defaultSettings, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Failed to parse settings from localStorage', e);
    }
    applyTheme(settings.value.theme);
  };

  const persist = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value));
    }
  };

  const saveSettings = (newSettings: Partial<UserSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
    persist();
    if (newSettings.theme) {
      applyTheme(newSettings.theme);
    }
  };

  const addVehicle = (data: Omit<Vehicle, 'id'>): Vehicle => {
    const newVeh: Vehicle = {
      ...data,
      id: `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const list = settings.value.vehicles ? [...settings.value.vehicles] : [];
    list.push(newVeh);
    const activeId = settings.value.activeVehicleId || newVeh.id;
    saveSettings({ vehicles: list, activeVehicleId: activeId });
    return newVeh;
  };

  const updateVehicle = (id: string, data: Partial<Vehicle>) => {
    if (!settings.value.vehicles) return;
    const list = settings.value.vehicles.map((v) => (v.id === id ? { ...v, ...data } : v));
    saveSettings({ vehicles: list });
  };

  const deleteVehicle = (id: string) => {
    if (!settings.value.vehicles) return;
    const list = settings.value.vehicles.filter((v) => v.id !== id);
    let activeId = settings.value.activeVehicleId;
    if (activeId === id) {
      activeId = list.length > 0 ? list[0].id : undefined;
    }
    saveSettings({ vehicles: list, activeVehicleId: activeId });
  };

  const setActiveVehicle = (id: string) => {
    saveSettings({ activeVehicleId: id });
  };

  const vehicles = computed<Vehicle[]>(() => settings.value.vehicles || []);

  const activeVehicle = computed<Vehicle | null>(() => {
    const list = vehicles.value;
    if (list.length === 0) return null;
    return list.find((v) => v.id === settings.value.activeVehicleId) || list[0] || null;
  });

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  onMounted(() => {
    loadSettings();
  });

  return {
    settings,
    vehicles,
    activeVehicle,
    saveSettings,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicle,
    applyTheme,
  };
}
