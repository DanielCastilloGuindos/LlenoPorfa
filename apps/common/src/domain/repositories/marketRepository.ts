import type { CrudeOilDailyPrice } from '../entities/prices.js';

export interface MarketRepository {
  saveCrudeDailyPrice(price: CrudeOilDailyPrice): Promise<void>;
  getCrudeDailyPrices(limitDays?: number): Promise<CrudeOilDailyPrice[]>;
  getLatestCrudePrice(): Promise<CrudeOilDailyPrice | null>;
}
