import type { CrudeOilDailyPrice } from '../entities/prices';

export interface MarketRepository {
  saveCrudeDailyPrice(price: CrudeOilDailyPrice): Promise<void>;
  getCrudeDailyPrices(limitDays?: number): Promise<CrudeOilDailyPrice[]>;
  getLatestCrudePrice(): Promise<CrudeOilDailyPrice | null>;
}
