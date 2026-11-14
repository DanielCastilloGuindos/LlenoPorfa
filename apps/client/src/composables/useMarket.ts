import { ref, computed } from 'vue';
import type { MarketApiResponse } from '../types';

const STORAGE_KEY = 'llenoporfa_market_cache_v1';

const marketData = ref<MarketApiResponse | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const isBarometerOpen = ref<boolean>(false);

// Immediate load from local cache if available
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      marketData.value = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load market cache', e);
  }
}

export function useMarket() {
  const fetchMarketData = async (avgG95?: number, avgDiesel?: number) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (avgG95 && avgG95 > 0.5) {
        params.append('avg_g95', avgG95.toFixed(3));
      }
      if (avgDiesel && avgDiesel > 0.5) {
        params.append('avg_diesel', avgDiesel.toFixed(3));
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/market${queryString}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: MarketApiResponse = await res.json();
      marketData.value = data;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn('Failed to fetch market data:', err);
      error.value = err.message || 'Error al obtener datos del mercado';
    } finally {
      loading.value = false;
    }
  };

  const openBarometer = () => {
    isBarometerOpen.value = true;
  };

  const closeBarometer = () => {
    isBarometerOpen.value = false;
  };

  const crudePriceFormatted = computed(() => {
    if (!marketData.value) return '---';
    return marketData.value.crude_eur_liter.toFixed(2).replace('.', ',');
  });

  const delta7dFormatted = computed(() => {
    if (!marketData.value) return '';
    const d = marketData.value.delta_7d_pct;
    const sign = d > 0 ? '+' : '';
    return `${sign}${d.toFixed(1).replace('.', ',')}%`;
  });

  return {
    marketData,
    loading,
    error,
    isBarometerOpen,
    openBarometer,
    closeBarometer,
    fetchMarketData,
    crudePriceFormatted,
    delta7dFormatted,
  };
}
