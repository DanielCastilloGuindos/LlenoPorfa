export type FuelId =
  | 'g95_e5'
  | 'diesel_a'
  | 'g98_e5'
  | 'diesel_premium'
  | 'glp'
  | 'gnc'
  | 'electric_kwh'
  | 'hydrogen_kg';

export type SortMode = 'price' | 'distance' | 'smart';

export type PriceTier = 'low' | 'medium' | 'high';

export interface FuelPrices {
  g95_e5: number | null;
  g98_e5: number | null;
  diesel_a: number | null;
  diesel_premium: number | null;
  glp: number | null;
  gnc?: number | null;
  electric_kwh?: number | null;
  hydrogen_kg?: number | null;
}

export interface Station {
  id: string;
  external_id?: string;
  type?: 'gas' | 'electric' | 'hydrogen';
  name?: string;
  brand: string;
  brand_or_operator?: string;
  address: string;
  municipality: string;
  province: string;
  postal_code: string;
  schedule: string;
  is_open_24h: boolean;
  latitude: number;
  longitude: number;
  distance_km: number | null;
  prices: FuelPrices;
  selected_fuel_price: number | null;
  price_tier: PriceTier | null;
  smart_score: number | null;
  metadata?: {
    connectors?: Array<{
      standard: string;
      powerKw: number;
      count: number;
      status?: string;
    }>;
    dispensers?: Array<{
      pressureBar: number;
      status?: string;
    }>;
    [key: string]: any;
  };
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface StationsApiResponse {
  count: number;
  fuel: FuelId;
  radius_km: number;
  center: Coordinates | null;
  average_price: number | null;
  min_price: number | null;
  max_price: number | null;
  stations: Station[];
}

export interface FuelOption {
  id: FuelId;
  label: string;
  short_label: string;
}

export interface FiltersApiResponse {
  fuels: FuelOption[];
  popular_brands: string[];
  radius_options: number[];
  sort_options: { id: SortMode; label: string }[];
}

export interface Vehicle {
  id: string;
  alias: string;
  plate?: string;
  fuelType: FuelId;
  tankCapacityLiters: number;
  fiscalName?: string;
  fiscalNif?: string;
  isDefault?: boolean;
}

export interface RefuelLog {
  id: string;
  stationName: string;
  stationId?: string;
  stationAddress?: string;
  date: string; // ISO string e.g. 2026-11-14T16:20
  fuelType: FuelId;
  pricePerLiter: number;
  liters: number;
  totalAmount: number;
  odometerKm?: number | null;
  notes?: string;
  savingsEur?: number;
  vehicleId?: string;
  vehicleAlias?: string;
  vehiclePlate?: string;
  createdAt: number;
}

export interface UserSettings {
  defaultFuel: FuelId;
  defaultRadius: number;
  tankCapacityLiters: number;
  theme: 'light' | 'dark' | 'system';
  vehicles?: Vehicle[];
  activeVehicleId?: string;
  fiscalName?: string;
  fiscalNif?: string;
  nativeBackgroundRadar?: boolean;
}

export type TabId = 'search' | 'refuel' | 'map' | 'favorites' | 'settings';

export interface DailyMarketPoint {
  date: string;
  timestamp: number;
  brent_usd: number;
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

export interface MarketApiResponse {
  updated_at: number;
  brent_usd: number;
  eur_usd: number;
  crude_eur_barrel: number;
  crude_eur_liter: number;
  delta_24h_pct: number;
  delta_7d_pct: number;
  trend: 'rising' | 'falling' | 'stable';
  trend_message: string;
  history: DailyMarketPoint[];
  fuels: {
    g95_e5: FuelMarketDetails;
    diesel_a: FuelMarketDetails;
  };
}
