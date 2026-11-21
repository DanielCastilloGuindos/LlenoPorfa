import type { StationRepository, SyncResultDto } from '@llenoporfa/common';
import { DgtDatexClient } from '../../../infrastructure/external/DgtDatexClient.js';

export class SyncElectricStationsUseCase {
  constructor(
    private readonly stationRepo: StationRepository,
    private readonly dgtClient: DgtDatexClient = new DgtDatexClient()
  ) {}

  async execute(): Promise<SyncResultDto> {
    const start = Date.now();
    try {
      console.log('[SyncElectricStationsUseCase] Starting electric charging stations sync...');
      const { stations, prices } = await this.dgtClient.fetchElectricStations();

      await this.stationRepo.saveBatch(stations);
      if (prices.length > 0) {
        await this.stationRepo.saveDailyPricesBatch(prices);
      }

      const durationMs = Date.now() - start;
      console.log(
        `[SyncElectricStationsUseCase] Synced ${stations.length} charging stations in ${durationMs}ms`
      );

      return {
        type: 'electric',
        success: true,
        totalProcessed: stations.length,
        totalUpserted: stations.length,
        durationMs,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      console.error('[SyncElectricStationsUseCase] Error syncing electric stations:', err);
      return {
        type: 'electric',
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
