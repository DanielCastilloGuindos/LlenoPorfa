import type {
  Coordinates,
  FuelId,
  FuelPrices,
  SortMode,
  Station,
  StationType,
  DailyMarketPoint,
} from '../../domain/index.js';

export interface StationsQueryDto {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  fuel?: FuelId;
  type?: StationType;
  brand?: string;
  open24h?: boolean;
  sort?: SortMode;
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

export interface StationHistoryPoint {
  date: string;
  prices: FuelPrices;
  brent_usd?: number | null;
  eur_usd?: number | null;
}

export interface StationHistoryDto {
  station: Station;
  history: StationHistoryPoint[];
}

export interface MarketHistoryDto {
  crude: DailyMarketPoint[];
  fuels_national_avg: Array<{
    date: string;
    avg_g95: number | null;
    avg_diesel: number | null;
  }>;
}

export interface SyncResultDto {
  type: StationType | 'crude' | 'all';
  success: boolean;
  totalProcessed: number;
  totalUpserted: number;
  durationMs: number;
  timestamp: number;
  errors?: string[];
}
