import { ref, computed } from 'vue';
import type { MarketApiResponse, DailyMarketPoint } from '../types';
import { apiUrl } from '../utils/apiBase';

const STORAGE_KEY = 'llenoporfa_market_cache_v1';

export function getCountForRange(range: string): number {
  switch (range.toLowerCase()) {
    case '7d':
    case '1w':
    case '1s':
      return 7;
    case '3mo':
    case '3m':
      return 90;
    case '6mo':
    case '6m':
      return 180;
    case '1y':
    case '1a':
      return 365;
    case 'max':
    case 'all':
    case 'todo':
    case 'siempre':
      return 730;
    case '1mo':
    case '30d':
    default:
      return 30;
  }
}

export function generateBaselinePoints(count: number = 30): DailyMarketPoint[] {
  const points: DailyMarketPoint[] = [];
  const now = Math.floor(Date.now() / 1000);
  const baseBrent = 82.5;
  const baseFx = 1.085;
  const litPerBbl = 158.987;

  for (let i = count - 1; i >= 0; i--) {
    const ts = now - i * 86400;
    const d = new Date(ts * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const wave = Math.sin(i / 3.5) * 1.8 + Math.cos(i / 6.0) * 1.0;
    const brent = Math.round((baseBrent - (i * 0.04) + wave) * 100) / 100;
    const fx = Math.round((baseFx + Math.sin(i / 4.5) * 0.007) * 10000) / 10000;
    const bblEur = Math.round((brent / fx) * 100) / 100;
    const litEur = Math.round((bblEur / litPerBbl) * 1000) / 1000;

    points.push({
      date: dateStr,
      timestamp: ts,
      brent_usd: brent,
      eur_usd: fx,
      crude_eur_barrel: bblEur,
      crude_eur_liter: litEur,
    });
  }
  return points;
}

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
  history: generateBaselinePoints(30),
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
const selectedRange = ref<string>('1mo');
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const isBarometerOpen = ref<boolean>(false);

const getStorageKey = (range: string = '1mo') => `${STORAGE_KEY}_${range}`;

// Immediate load from local cache if available
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(getStorageKey('1mo')) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.crude_eur_liter) {
        if (!parsed.history || parsed.history.length < 5) {
          parsed.history = generateBaselinePoints(30);
        }
        marketData.value = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load market cache', e);
  }
}

export function useMarket() {
  const fetchMarketData = async (avgG95?: number, avgDiesel?: number, range?: string) => {
    const targetRange = range || selectedRange.value;
    selectedRange.value = targetRange;
    loading.value = true;
    error.value = null;

    // Check if we have this specific range cached locally for instant display
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem(getStorageKey(targetRange));
        if (cachedRaw) {
          const cachedParsed = JSON.parse(cachedRaw);
          if (cachedParsed && cachedParsed.history && cachedParsed.history.length > 0) {
            marketData.value = cachedParsed;
          }
        }
      } catch (_) {}
    }

    try {
      const params = new URLSearchParams();
      if (avgG95 && avgG95 > 0.5) {
        params.append('avg_g95', avgG95.toFixed(3));
      }
      if (avgDiesel && avgDiesel > 0.5) {
        params.append('avg_diesel', avgDiesel.toFixed(3));
      }
      params.append('range', targetRange);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(apiUrl(`/api/market${queryString}`));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: MarketApiResponse = await res.json();
      if (!data.history || data.history.length === 0) {
        data.history = generateBaselinePoints(getCountForRange(targetRange));
      }
      marketData.value = data;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getStorageKey(targetRange), JSON.stringify(data));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
      }
    } catch (err: any) {
      console.warn('Failed to fetch market data:', err);
      error.value = err.message || 'Error al obtener datos del mercado';
      // If offline/fallback, adjust history points length to match range accurately
      if (marketData.value) {
        marketData.value = {
          ...marketData.value,
          history: generateBaselinePoints(getCountForRange(targetRange)),
        };
      }
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
    if (!marketData.value || typeof marketData.value.crude_eur_liter !== 'number') return '---';
    return marketData.value.crude_eur_liter.toFixed(2).replace('.', ',');
  });

  const delta7dFormatted = computed(() => {
    if (!marketData.value || typeof marketData.value.delta_7d_pct !== 'number') return '';
    const d = marketData.value.delta_7d_pct;
    const sign = d > 0 ? '+' : '';
    return `${sign}${d.toFixed(1).replace('.', ',')}%`;
  });

  return {
    marketData,
    selectedRange,
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
