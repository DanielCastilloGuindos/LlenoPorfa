import type { Client } from '@libsql/client';
import type {
  Station,
  StationDailyPrice,
  StationRepository,
  StationType,
  FuelPrices,
} from '@llenoporfa/common';
import { getDbClient } from './client.js';

export class LibSqlStationRepository implements StationRepository {
  constructor(private readonly client: Client = getDbClient()) {}

  async save(station: Station): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO stations (
          id, external_id, type, name, brand_or_operator, address,
          municipality, province, postal_code, lat, lng, schedule,
          is_open_24h, metadata_json, is_active, last_synced_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          brand_or_operator = excluded.brand_or_operator,
          address = excluded.address,
          municipality = excluded.municipality,
          province = excluded.province,
          postal_code = excluded.postal_code,
          lat = excluded.lat,
          lng = excluded.lng,
          schedule = excluded.schedule,
          is_open_24h = excluded.is_open_24h,
          metadata_json = excluded.metadata_json,
          is_active = excluded.is_active,
          last_synced_at = excluded.last_synced_at
      `,
      args: [
        station.id,
        station.externalId,
        station.type,
        station.name,
        station.brandOrOperator,
        station.address,
        station.municipality,
        station.province,
        station.postalCode,
        station.latitude,
        station.longitude,
        station.schedule || null,
        station.isOpen24h ? 1 : 0,
        station.metadata ? JSON.stringify(station.metadata) : null,
        station.isActive ? 1 : 0,
        station.lastSyncedAt,
      ],
    });
  }

  async saveBatch(stations: Station[]): Promise<void> {
    if (stations.length === 0) return;

    // Batch insert using transactions in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < stations.length; i += chunkSize) {
      const chunk = stations.slice(i, i + chunkSize);
      const statements = chunk.map((s) => ({
        sql: `
          INSERT INTO stations (
            id, external_id, type, name, brand_or_operator, address,
            municipality, province, postal_code, lat, lng, schedule,
            is_open_24h, metadata_json, is_active, last_synced_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            brand_or_operator = excluded.brand_or_operator,
            address = excluded.address,
            municipality = excluded.municipality,
            province = excluded.province,
            postal_code = excluded.postal_code,
            lat = excluded.lat,
            lng = excluded.lng,
            schedule = excluded.schedule,
            is_open_24h = excluded.is_open_24h,
            metadata_json = excluded.metadata_json,
            is_active = excluded.is_active,
            last_synced_at = excluded.last_synced_at
        `,
        args: [
          s.id,
          s.externalId,
          s.type,
          s.name,
          s.brandOrOperator,
          s.address,
          s.municipality,
          s.province,
          s.postalCode,
          s.latitude,
          s.longitude,
          s.schedule || null,
          s.isOpen24h ? 1 : 0,
          s.metadata ? JSON.stringify(s.metadata) : null,
          s.isActive ? 1 : 0,
          s.lastSyncedAt,
        ],
      }));

      await this.client.batch(statements, 'write');
    }
  }

  async findById(id: string): Promise<Station | null> {
    const res = await this.client.execute({
      sql: `
        SELECT s.*, p.gasoline_95, p.gasoline_98, p.diesel_a, p.diesel_premium,
               p.glp, p.gnc, p.electric_kwh_price, p.hydrogen_kg_price
        FROM stations s
        LEFT JOIN station_daily_prices p ON s.id = p.station_id AND p.recorded_date = (
          SELECT MAX(recorded_date) FROM station_daily_prices WHERE station_id = s.id
        )
        WHERE s.id = ?
      `,
      args: [id],
    });

    if (res.rows.length === 0) return null;
    return this.mapRowToStation(res.rows[0]);
  }

  async findByExternalId(externalId: string, type: StationType): Promise<Station | null> {
    const res = await this.client.execute({
      sql: `SELECT * FROM stations WHERE external_id = ? AND type = ? LIMIT 1`,
      args: [externalId, type],
    });

    if (res.rows.length === 0) return null;
    return this.mapRowToStation(res.rows[0]);
  }

  async findInBoundingBox(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    type?: StationType
  ): Promise<Station[]> {
    let sql = `
      SELECT s.*, p.gasoline_95, p.gasoline_98, p.diesel_a, p.diesel_premium,
             p.glp, p.gnc, p.electric_kwh_price, p.hydrogen_kg_price
      FROM stations s
      LEFT JOIN station_daily_prices p ON s.id = p.station_id AND p.recorded_date = (
        SELECT MAX(recorded_date) FROM station_daily_prices WHERE station_id = s.id
      )
      WHERE s.is_active = 1
        AND s.lat BETWEEN ? AND ?
        AND s.lng BETWEEN ? AND ?
    `;
    const args: any[] = [minLat, maxLat, minLng, maxLng];

    if (type) {
      sql += ` AND s.type = ?`;
      args.push(type);
    }

    const res = await this.client.execute({ sql, args });
    return res.rows.map((row) => this.mapRowToStation(row));
  }

  async findAllActive(type?: StationType): Promise<Station[]> {
    let sql = `
      SELECT s.*, p.gasoline_95, p.gasoline_98, p.diesel_a, p.diesel_premium,
             p.glp, p.gnc, p.electric_kwh_price, p.hydrogen_kg_price
      FROM stations s
      LEFT JOIN station_daily_prices p ON s.id = p.station_id AND p.recorded_date = (
        SELECT MAX(recorded_date) FROM station_daily_prices WHERE station_id = s.id
      )
      WHERE s.is_active = 1
    `;
    const args: any[] = [];
    if (type) {
      sql += ` AND s.type = ?`;
      args.push(type);
    }

    const res = await this.client.execute({ sql, args });
    return res.rows.map((row) => this.mapRowToStation(row));
  }

  async saveDailyPrice(price: StationDailyPrice): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO station_daily_prices (
          id, station_id, recorded_date, gasoline_95, gasoline_98,
          diesel_a, diesel_premium, glp, gnc, electric_kwh_price,
          hydrogen_kg_price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(station_id, recorded_date) DO UPDATE SET
          gasoline_95 = excluded.gasoline_95,
          gasoline_98 = excluded.gasoline_98,
          diesel_a = excluded.diesel_a,
          diesel_premium = excluded.diesel_premium,
          glp = excluded.glp,
          gnc = excluded.gnc,
          electric_kwh_price = excluded.electric_kwh_price,
          hydrogen_kg_price = excluded.hydrogen_kg_price,
          created_at = excluded.created_at
      `,
      args: [
        price.id,
        price.stationId,
        price.recordedDate,
        price.prices.g95_e5 ?? null,
        price.prices.g98_e5 ?? null,
        price.prices.diesel_a ?? null,
        price.prices.diesel_premium ?? null,
        price.prices.glp ?? null,
        price.prices.gnc ?? null,
        price.prices.electric_kwh ?? null,
        price.prices.hydrogen_kg ?? null,
        price.createdAt,
      ],
    });
  }

  async saveDailyPricesBatch(prices: StationDailyPrice[]): Promise<void> {
    if (prices.length === 0) return;

    const chunkSize = 100;
    for (let i = 0; i < prices.length; i += chunkSize) {
      const chunk = prices.slice(i, i + chunkSize);
      const statements = chunk.map((p) => ({
        sql: `
          INSERT INTO station_daily_prices (
            id, station_id, recorded_date, gasoline_95, gasoline_98,
            diesel_a, diesel_premium, glp, gnc, electric_kwh_price,
            hydrogen_kg_price, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(station_id, recorded_date) DO UPDATE SET
            gasoline_95 = excluded.gasoline_95,
            gasoline_98 = excluded.gasoline_98,
            diesel_a = excluded.diesel_a,
            diesel_premium = excluded.diesel_premium,
            glp = excluded.glp,
            gnc = excluded.gnc,
            electric_kwh_price = excluded.electric_kwh_price,
            hydrogen_kg_price = excluded.hydrogen_kg_price,
            created_at = excluded.created_at
        `,
        args: [
          p.id,
          p.stationId,
          p.recordedDate,
          p.prices.g95_e5 ?? null,
          p.prices.g98_e5 ?? null,
          p.prices.diesel_a ?? null,
          p.prices.diesel_premium ?? null,
          p.prices.glp ?? null,
          p.prices.gnc ?? null,
          p.prices.electric_kwh ?? null,
          p.prices.hydrogen_kg ?? null,
          p.createdAt,
        ],
      }));

      await this.client.batch(statements, 'write');
    }
  }

  async getDailyPricesForStation(stationId: string, limitDays = 30): Promise<StationDailyPrice[]> {
    const res = await this.client.execute({
      sql: `
        SELECT * FROM station_daily_prices
        WHERE station_id = ?
        ORDER BY recorded_date DESC
        LIMIT ?
      `,
      args: [stationId, limitDays],
    });

    return res.rows.map((row: any) => ({
      id: String(row.id),
      stationId: String(row.station_id),
      recordedDate: String(row.recorded_date),
      prices: {
        g95_e5: row.gasoline_95 !== null ? Number(row.gasoline_95) : null,
        g98_e5: row.gasoline_98 !== null ? Number(row.gasoline_98) : null,
        diesel_a: row.diesel_a !== null ? Number(row.diesel_a) : null,
        diesel_premium: row.diesel_premium !== null ? Number(row.diesel_premium) : null,
        glp: row.glp !== null ? Number(row.glp) : null,
        gnc: row.gnc !== null ? Number(row.gnc) : null,
        electric_kwh: row.electric_kwh_price !== null ? Number(row.electric_kwh_price) : null,
        hydrogen_kg: row.hydrogen_kg_price !== null ? Number(row.hydrogen_kg_price) : null,
      },
      createdAt: Number(row.created_at),
    }));
  }

  async getDailyAveragePrices(limitDays = 30): Promise<{
    date: string;
    avg_g95: number | null;
    avg_diesel: number | null;
  }[]> {
    const res = await this.client.execute({
      sql: `
        SELECT
          recorded_date as date,
          AVG(gasoline_95) as avg_g95,
          AVG(diesel_a) as avg_diesel
        FROM station_daily_prices
        GROUP BY recorded_date
        ORDER BY recorded_date DESC
        LIMIT ?
      `,
      args: [limitDays],
    });

    return res.rows.map((row: any) => ({
      date: String(row.date),
      avg_g95: row.avg_g95 !== null ? Math.round(Number(row.avg_g95) * 1000) / 1000 : null,
      avg_diesel: row.avg_diesel !== null ? Math.round(Number(row.avg_diesel) * 1000) / 1000 : null,
    }));
  }

  async countByType(): Promise<Record<StationType, number>> {
    const res = await this.client.execute(`
      SELECT type, COUNT(*) as count
      FROM stations
      WHERE is_active = 1
      GROUP BY type
    `);

    const result: Record<StationType, number> = {
      gas: 0,
      electric: 0,
      hydrogen: 0,
    };

    for (const row of res.rows as any[]) {
      if (row.type in result) {
        result[row.type as StationType] = Number(row.count);
      }
    }
    return result;
  }

  async getLastSyncTime(type?: StationType): Promise<number | null> {
    let sql = `SELECT MAX(last_synced_at) as max_sync FROM stations`;
    const args: any[] = [];
    if (type) {
      sql += ` WHERE type = ?`;
      args.push(type);
    }
    const res = await this.client.execute({ sql, args });
    if (res.rows.length === 0 || res.rows[0].max_sync === null) return null;
    return Number(res.rows[0].max_sync);
  }

  private mapRowToStation(row: any): Station {
    let metadata: any = undefined;
    if (row.metadata_json) {
      try {
        metadata = JSON.parse(String(row.metadata_json));
      } catch {
        // ignore JSON parse error
      }
    }

    const prices: FuelPrices = {
      g95_e5: row.gasoline_95 !== null && row.gasoline_95 !== undefined ? Number(row.gasoline_95) : null,
      g98_e5: row.gasoline_98 !== null && row.gasoline_98 !== undefined ? Number(row.gasoline_98) : null,
      diesel_a: row.diesel_a !== null && row.diesel_a !== undefined ? Number(row.diesel_a) : null,
      diesel_premium: row.diesel_premium !== null && row.diesel_premium !== undefined ? Number(row.diesel_premium) : null,
      glp: row.glp !== null && row.glp !== undefined ? Number(row.glp) : null,
      gnc: row.gnc !== null && row.gnc !== undefined ? Number(row.gnc) : null,
      electric_kwh: row.electric_kwh_price !== null && row.electric_kwh_price !== undefined ? Number(row.electric_kwh_price) : null,
      hydrogen_kg: row.hydrogen_kg_price !== null && row.hydrogen_kg_price !== undefined ? Number(row.hydrogen_kg_price) : null,
    };

    const brand = String(row.brand_or_operator);
    const postalCode = String(row.postal_code);
    const isOpen24h = Boolean(row.is_open_24h);

    return {
      id: String(row.id),
      externalId: String(row.external_id),
      external_id: String(row.external_id),
      type: row.type as StationType,
      name: String(row.name),
      brand,
      brandOrOperator: brand,
      brand_or_operator: brand,
      address: String(row.address),
      municipality: String(row.municipality),
      province: String(row.province),
      postalCode,
      postal_code: postalCode,
      latitude: Number(row.lat),
      longitude: Number(row.lng),
      schedule: row.schedule ? String(row.schedule) : undefined,
      isOpen24h,
      is_open_24h: isOpen24h,
      isActive: Boolean(row.is_active),
      is_active: Boolean(row.is_active),
      lastSyncedAt: Number(row.last_synced_at),
      last_synced_at: Number(row.last_synced_at),
      metadata,
      prices,
    };
  }
}
