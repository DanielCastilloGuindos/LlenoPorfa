import type { FuelPrices } from './station';

export interface StationDailyPrice {
  id: string;
  stationId: string;
  recordedDate: string; // YYYY-MM-DD
  prices: FuelPrices;
  createdAt: number;
}

export interface CrudeOilDailyPrice {
  id: string;
  recordedDate: string; // YYYY-MM-DD
  brentUsd: number;
  wtiUsd?: number | null;
  eurUsdRate?: number | null;
  source: string;
  createdAt: number;
}
