export const LITERS_PER_BARREL = 158.987;
export const IEH_GASOLINA_95 = 0.47269;
export const IEH_DIESEL_A = 0.379;
export const IVA_RATE = 0.21;
export const DEFAULT_MARGIN_REF = 0.25;

export interface DailyMarketPoint {
  date: string; // YYYY-MM-DD
  timestamp: number;
  brent_usd: number;
  wti_usd?: number | null;
  eur_usd: number;
  crude_eur_barrel: number;
  crude_eur_liter: number;
}

export interface FuelTaxBreakdown {
  crude_cost: number;
  crude_pct: number;
  refining_margin: number;
  refining_margin_pct: number;
  ieh: number;
  ieh_pct: number;
  iva: number;
  iva_pct: number;
}

export interface FuelMarketDetails {
  name: string;
  ieh: number;
  iva_rate: number;
  pvp: number;
  is_real_avg: boolean;
  breakdown: FuelTaxBreakdown;
}

export interface FuelsMap {
  g95_e5: FuelMarketDetails;
  diesel_a: FuelMarketDetails;
}

export interface MarketResponse {
  updated_at: number;
  brent_usd: number;
  eur_usd: number;
  crude_eur_barrel: number;
  crude_eur_liter: number;
  delta_24h_pct: number;
  delta_7d_pct: number;
  trend: 'rising' | 'falling' | 'stable';
  trend_message: string;
  fuels: FuelsMap;
  history: DailyMarketPoint[];
}
