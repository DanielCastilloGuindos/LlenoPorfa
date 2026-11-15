import type {
  DailyMarketPoint,
  MarketHistoryDto,
  MarketRepository,
  StationRepository,
} from '@llenoporfa/common';
import { LITERS_PER_BARREL } from '@llenoporfa/common';

export class GetMarketHistoryUseCase {
  constructor(
    private readonly marketRepo: MarketRepository,
    private readonly stationRepo: StationRepository
  ) {}

  async execute(limitDays = 30): Promise<MarketHistoryDto> {
    const [crudePrices, fuelAvgs] = await Promise.all([
      this.marketRepo.getCrudeDailyPrices(limitDays),
      this.stationRepo.getDailyAveragePrices(limitDays),
    ]);

    const crudePoints: DailyMarketPoint[] = crudePrices.map((c) => {
      const eurUsd = c.eurUsdRate || 1.08;
      const bblEur = Math.round((c.brentUsd / eurUsd) * 100) / 100;
      const litEur = Math.round((bblEur / LITERS_PER_BARREL) * 1000) / 1000;

      return {
        date: c.recordedDate,
        timestamp: Math.floor(c.createdAt / 1000),
        brent_usd: c.brentUsd,
        wti_usd: c.wtiUsd ?? null,
        eur_usd: eurUsd,
        crude_eur_barrel: bblEur,
        crude_eur_liter: litEur,
      };
    });

    return {
      crude: crudePoints,
      fuels_national_avg: fuelAvgs,
    };
  }
}
