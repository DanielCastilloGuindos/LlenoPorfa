import type { StationRepository, SyncResultDto } from '@llenoporfa/common';
import { OsmOverpassClient } from '../../../infrastructure/external/OsmOverpassClient';

export class SyncHydrogenStationsUseCase {
  constructor(
    private readonly stationRepo: StationRepository,
    private readonly overpassClient: OsmOverpassClient = new OsmOverpassClient()
  ) {}

  async execute(): Promise<SyncResultDto> {
    const start = Date.now();
    try {
      console.log('[SyncHydrogenStationsUseCase] Starting hydrogen stations sync...');
      const { stations, prices } = await this.overpassClient.fetchHydrogenStations();

      await this.stationRepo.saveBatch(stations);
      if (prices.length > 0) {
        await this.stationRepo.saveDailyPricesBatch(prices);
      }

      const durationMs = Date.now() - start;
      console.log(
        `[SyncHydrogenStationsUseCase] Synced ${stations.length} hydrogen stations in ${durationMs}ms`
      );

      return {
        type: 'hydrogen',
        success: true,
        totalProcessed: stations.length,
        totalUpserted: stations.length,
        durationMs,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      console.error('[SyncHydrogenStationsUseCase] Error syncing hydrogen stations:', err);
      return {
        type: 'hydrogen',
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
