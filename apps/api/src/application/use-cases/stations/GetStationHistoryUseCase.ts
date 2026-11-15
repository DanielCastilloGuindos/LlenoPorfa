import type {
  MarketRepository,
  StationHistoryDto,
  StationHistoryPoint,
  StationRepository,
} from '@llenoporfa/common';

export class GetStationHistoryUseCase {
  constructor(
    private readonly stationRepo: StationRepository,
    private readonly marketRepo: MarketRepository
  ) {}

  async execute(stationId: string, limitDays = 30): Promise<StationHistoryDto | null> {
    const station = await this.stationRepo.findById(stationId);
    if (!station) return null;

    const [stationPrices, crudePrices] = await Promise.all([
      this.stationRepo.getDailyPricesForStation(stationId, limitDays),
      this.marketRepo.getCrudeDailyPrices(limitDays),
    ]);

    // Map crude prices by date for fast lookup
    const crudeMap = new Map<string, { brent: number; eurUsd: number | null }>();
    for (const c of crudePrices) {
      crudeMap.set(c.recordedDate, {
        brent: c.brentUsd,
        eurUsd: c.eurUsdRate ?? null,
      });
    }

    const history: StationHistoryPoint[] = stationPrices.map((sp) => {
      const crude = crudeMap.get(sp.recordedDate);
      return {
        date: sp.recordedDate,
        prices: sp.prices,
        brent_usd: crude?.brent ?? null,
        eur_usd: crude?.eurUsd ?? null,
      };
    });

    return {
      station,
      history,
    };
  }
}
