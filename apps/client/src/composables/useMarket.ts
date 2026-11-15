import { ref, computed } from 'vue';
import type { MarketApiResponse } from '../types';
import { apiUrl } from '../utils/apiBase';

const STORAGE_KEY = 'llenoporfa_market_cache_v1';

export const DEFAULT_MARKET_BASELINE: MarketApiResponse = {
  updated_at: Math.floor(Date.now() / 1000),
  brent_usd: 82.5,
  eur_usd: 1.085,
  crude_eur_barrel: 76.04,
  crude_eur_liter: 0.478,
  delta_24h_pct: 0.4,
  delta_7d_pct: 1.2,
  trend: 'stable',
  trend_message: 'El precio del crudo se mantiene estable en los mercados internacionales.',
  history: [
    {
      date: '2026-11-08',
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 7,
      brent_usd: 81.5,
      eur_usd: 1.082,
      crude_eur_barrel: 75.32,
      crude_eur_liter: 0.474,
    },
    {
      date: '2026-11-14',
      timestamp: Math.floor(Date.now() / 1000) - 86400,
      brent_usd: 82.1,
      eur_usd: 1.084,
      crude_eur_barrel: 75.74,
      crude_eur_liter: 0.476,
    },
    {
      date: '2026-11-15',
      timestamp: Math.floor(Date.now() / 1000),
      brent_usd: 82.5,
      eur_usd: 1.085,
      crude_eur_barrel: 76.04,
      crude_eur_liter: 0.478,
    },
  ],
  fuels: {
    g95_e5: {
      name: 'Gasolina 95 E5',
      ieh: 0.47269,
      iva_rate: 0.21,
      pvp: 1.629,
      is_real_avg: false,
      breakdown: {
        crude_cost: 0.478,
        crude_pct: 29.3,
        refining_margin: 0.395,
        refining_margin_pct: 24.3,
        ieh: 0.47269,
        ieh_pct: 29.0,
        iva: 0.283,
        iva_pct: 17.4,
      },
    },
    diesel_a: {
      name: 'Gasóleo A',
      ieh: 0.379,
      iva_rate: 0.21,
      pvp: 1.519,
      is_real_avg: false,
      breakdown: {
        crude_cost: 0.478,
        crude_pct: 31.5,
        refining_margin: 0.398,
        refining_margin_pct: 26.2,
        ieh: 0.379,
        ieh_pct: 25.0,
        iva: 0.264,
        iva_pct: 17.3,
      },
    },
  },
};

const marketData = ref<MarketApiResponse>(DEFAULT_MARKET_BASELINE);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const isBarometerOpen = ref<boolean>(false);

// Immediate load from local cache if available
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.crude_eur_liter) {
        marketData.value = parsed;
      }
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
      const res = await fetch(apiUrl(`/api/market${queryString}`));

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
