import type { Client } from '@libsql/client';
import type { CrudeOilDailyPrice, MarketRepository } from '@llenoporfa/common';
import { getDbClient } from './client';

export class LibSqlMarketRepository implements MarketRepository {
  constructor(private readonly client: Client = getDbClient()) {}

  async saveCrudeDailyPrice(price: CrudeOilDailyPrice): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO crude_oil_daily_prices (
          id, recorded_date, brent_usd, wti_usd, eur_usd_rate, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(recorded_date) DO UPDATE SET
          brent_usd = excluded.brent_usd,
          wti_usd = excluded.wti_usd,
          eur_usd_rate = excluded.eur_usd_rate,
          source = excluded.source,
          created_at = excluded.created_at
      `,
      args: [
        price.id,
        price.recordedDate,
        price.brentUsd,
        price.wtiUsd ?? null,
        price.eurUsdRate ?? null,
        price.source,
        price.createdAt,
      ],
    });
  }

  async getCrudeDailyPrices(limitDays = 30): Promise<CrudeOilDailyPrice[]> {
    const res = await this.client.execute({
      sql: `
        SELECT * FROM crude_oil_daily_prices
        ORDER BY recorded_date DESC
        LIMIT ?
      `,
      args: [limitDays],
    });

    return res.rows.map((row: any) => ({
      id: String(row.id),
      recordedDate: String(row.recorded_date),
      brentUsd: Number(row.brent_usd),
      wtiUsd: row.wti_usd !== null ? Number(row.wti_usd) : null,
      eurUsdRate: row.eur_usd_rate !== null ? Number(row.eur_usd_rate) : null,
      source: String(row.source),
      createdAt: Number(row.created_at),
    }));
  }

  async getLatestCrudePrice(): Promise<CrudeOilDailyPrice | null> {
    const res = await this.client.execute(`
      SELECT * FROM crude_oil_daily_prices
      ORDER BY recorded_date DESC
      LIMIT 1
    `);

    if (res.rows.length === 0) return null;
    const row: any = res.rows[0];
    return {
      id: String(row.id),
      recordedDate: String(row.recorded_date),
      brentUsd: Number(row.brent_usd),
      wtiUsd: row.wti_usd !== null ? Number(row.wti_usd) : null,
      eurUsdRate: row.eur_usd_rate !== null ? Number(row.eur_usd_rate) : null,
      source: String(row.source),
      createdAt: Number(row.created_at),
    };
  }
}
