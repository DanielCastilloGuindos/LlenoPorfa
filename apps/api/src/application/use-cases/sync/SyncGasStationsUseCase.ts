import type { StationRepository, SyncResultDto } from '@llenoporfa/common';
import { MitecoClient } from '../../../infrastructure/external/MitecoClient.js';

export class SyncGasStationsUseCase {
  constructor(
    private readonly stationRepo: StationRepository,
    private readonly mitecoClient: MitecoClient = new MitecoClient()
  ) {}

  async execute(): Promise<SyncResultDto> {
    const start = Date.now();
    try {
      console.log('[SyncGasStationsUseCase] Starting MITECO fuel stations sync...');
      const { stations, prices } = await this.mitecoClient.fetchAllStations();

      await this.stationRepo.saveBatch(stations);
      await this.stationRepo.saveDailyPricesBatch(prices);

      const durationMs = Date.now() - start;
      console.log(
        `[SyncGasStationsUseCase] Synced ${stations.length} gas stations and ${prices.length} price records in ${durationMs}ms`
      );

      return {
        type: 'gas',
        success: true,
        totalProcessed: stations.length,
        totalUpserted: stations.length,
        durationMs,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      console.error('[SyncGasStationsUseCase] Error syncing gas stations:', err);
      return {
        type: 'gas',
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
