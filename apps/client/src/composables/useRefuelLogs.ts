import { ref, computed, onMounted } from 'vue';
import type { RefuelLog, FuelId, Station } from '../types';

const STORAGE_KEY = 'llenoporfa_refuel_logs_v1';

const logs = ref<RefuelLog[]>([]);

export interface PrefillData {
  stationName: string;
  stationId?: string;
  stationAddress?: string;
  pricePerLiter?: number;
  averagePrice?: number;
  fuelType?: FuelId;
}

const activePrefill = ref<PrefillData | null>(null);

// Immediate load if window is defined
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      logs.value = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error parsing refuel logs from localStorage', e);
  }
}

export function useRefuelLogs() {
  const loadLogs = () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        logs.value = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error parsing refuel logs from localStorage', e);
    }
  };

  const persist = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.value));
    }
  };

  const addLog = (data: Omit<RefuelLog, 'id' | 'createdAt'>): RefuelLog => {
    const newLog: RefuelLog = {
      ...data,
      id: `refuel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now(),
    };
    logs.value.unshift(newLog);
    persist();
    return newLog;
  };

  const updateLog = (id: string, data: Partial<RefuelLog>) => {
    const idx = logs.value.findIndex((l) => l.id === id);
    if (idx !== -1) {
      logs.value[idx] = { ...logs.value[idx], ...data };
      persist();
    }
  };

  const deleteLog = (id: string) => {
    logs.value = logs.value.filter((l) => l.id !== id);
    persist();
  };

  const setPrefillFromStation = (station: Station, fuel: FuelId, averagePrice?: number) => {
    activePrefill.value = {
      stationName: station.brand,
      stationId: station.id,
      stationAddress: station.address,
      pricePerLiter: station.selected_fuel_price ?? undefined,
      averagePrice: averagePrice ?? undefined,
      fuelType: fuel,
    };
  };

  const clearPrefill = () => {
    activePrefill.value = null;
  };

  // Aggregated stats
  const stats = computed(() => {
    const totalSpent = logs.value.reduce((acc, l) => acc + (l.totalAmount || 0), 0);
    const totalLiters = logs.value.reduce((acc, l) => acc + (l.liters || 0), 0);
    const totalSavings = logs.value.reduce((acc, l) => acc + (l.savingsEur && l.savingsEur > 0 ? l.savingsEur : 0), 0);
    const avgPricePerLiter = totalLiters > 0 ? totalSpent / totalLiters : 0;

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalSavings: Math.round(totalSavings * 100) / 100,
      avgPricePerLiter: Math.round(avgPricePerLiter * 1000) / 1000,
      count: logs.value.length,
    };
  });

  onMounted(() => {
    loadLogs();
  });

  return {
    logs,
    activePrefill,
    stats,
    addLog,
    updateLog,
    deleteLog,
    setPrefillFromStation,
    clearPrefill,
  };
}
