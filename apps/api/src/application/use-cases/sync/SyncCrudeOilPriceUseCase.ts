import type { MarketRepository, SyncResultDto } from '@llenoporfa/common';
import { OilPriceClient } from '../../../infrastructure/external/OilPriceClient';

export class SyncCrudeOilPriceUseCase {
  constructor(
    private readonly marketRepo: MarketRepository,
    private readonly oilPriceClient: OilPriceClient = new OilPriceClient()
  ) {}

  async execute(): Promise<SyncResultDto> {
    const start = Date.now();
    try {
      console.log('[SyncCrudeOilPriceUseCase] Starting crude oil daily price sync...');
      const crudePrice = await this.oilPriceClient.fetchDailyCrudePrice();

      await this.marketRepo.saveCrudeDailyPrice(crudePrice);

      const durationMs = Date.now() - start;
      console.log(
        `[SyncCrudeOilPriceUseCase] Synced Brent: $${crudePrice.brentUsd}, EUR/USD: ${crudePrice.eurUsdRate} in ${durationMs}ms`
      );

      return {
        type: 'crude',
        success: true,
        totalProcessed: 1,
        totalUpserted: 1,
        durationMs,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      console.error('[SyncCrudeOilPriceUseCase] Error syncing crude oil prices:', err);
      return {
        type: 'crude',
        success: false,
        totalProcessed: 0,
        totalUpserted: 0,
        durationMs: Date.now() - start,
        timestamp: Date.now(),
        errors: [err.message || String(err)],
      };
    }
  }
}
