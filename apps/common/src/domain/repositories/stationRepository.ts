import type { Station, StationType } from '../entities/station.js';
import type { StationDailyPrice } from '../entities/prices.js';

export interface StationRepository {
  save(station: Station): Promise<void>;
  saveBatch(stations: Station[]): Promise<void>;
  findById(id: string): Promise<Station | null>;
  findByExternalId(externalId: string, type: StationType): Promise<Station | null>;
  findInBoundingBox(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    type?: StationType
  ): Promise<Station[]>;
  findAllActive(type?: StationType): Promise<Station[]>;
  saveDailyPrice(price: StationDailyPrice): Promise<void>;
  saveDailyPricesBatch(prices: StationDailyPrice[]): Promise<void>;
  getDailyPricesForStation(stationId: string, limitDays?: number): Promise<StationDailyPrice[]>;
  getDailyAveragePrices(limitDays?: number): Promise<{
    date: string;
    avg_g95: number | null;
    avg_diesel: number | null;
  }[]>;
  countByType(): Promise<Record<StationType, number>>;
  getLastSyncTime(type?: StationType): Promise<number | null>;
}
