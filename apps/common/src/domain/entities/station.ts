export type StationType = 'gas' | 'electric' | 'hydrogen';

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

export interface Coordinates {
  lat: number;
  lng: number;
}

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

export interface ElectricConnector {
  standard: string; // e.g. "CCS2", "Type 2", "CHAdeMO", "Schuko"
  powerKw: number;
  currentType?: 'AC' | 'DC';
  count: number;
  status?: 'available' | 'occupied' | 'out_of_order' | 'unknown';
}

export interface HydrogenDispenser {
  pressureBar: number; // e.g. 350 or 700 bar
  status?: 'available' | 'out_of_order' | 'unknown';
}

export interface StationMetadata {
  connectors?: ElectricConnector[];
  dispensers?: HydrogenDispenser[];
  operatorWebsite?: string;
  phone?: string;
  paymentMethods?: string[];
  accessType?: 'public' | 'restricted' | 'private';
  [key: string]: unknown;
}

export interface Station {
  id: string;
  externalId: string;
  type: StationType;
  name: string;
  brandOrOperator: string;
  address: string;
  municipality: string;
  province: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  schedule?: string;
  isOpen24h: boolean;
  isActive: boolean;
  lastSyncedAt: number;
  metadata?: StationMetadata;
  prices: FuelPrices;

  // Runtime computed fields (during location queries)
  distanceKm?: number | null;
  selectedFuelPrice?: number | null;
  priceTier?: PriceTier | null;
  smartScore?: number | null;

  // Snake_case aliases for API/frontend compatibility
  external_id?: string;
  brand?: string;
  brand_or_operator?: string;
  postal_code?: string;
  is_open_24h?: boolean;
  is_active?: boolean;
  last_synced_at?: number;
  distance_km?: number | null;
  selected_fuel_price?: number | null;
  price_tier?: PriceTier | null;
  smart_score?: number | null;
}

export type GasStation = Station & {
  type: 'gas';
};

export type ChargingStation = Station & {
  type: 'electric';
  metadata: StationMetadata & {
    connectors: ElectricConnector[];
  };
};

export type HydrogenStation = Station & {
  type: 'hydrogen';
  metadata: StationMetadata & {
    dispensers: HydrogenDispenser[];
  };
};
