export type FuelId = 'g95_e5' | 'diesel_a' | 'g98_e5' | 'diesel_premium' | 'glp';

export type SortMode = 'price' | 'distance' | 'smart';

export type PriceTier = 'low' | 'medium' | 'high';

export interface FuelPrices {
  g95_e5: number | null;
  g98_e5: number | null;
  diesel_a: number | null;
  diesel_premium: number | null;
  glp: number | null;
}

export interface Station {
  id: string;
  brand: string;
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
  createdAt: number;
}

export interface UserSettings {
  defaultFuel: FuelId;
  defaultRadius: number;
  tankCapacityLiters: number;
  theme: 'light' | 'dark' | 'system';
}

export type TabId = 'search' | 'refuel' | 'map' | 'favorites' | 'settings';
