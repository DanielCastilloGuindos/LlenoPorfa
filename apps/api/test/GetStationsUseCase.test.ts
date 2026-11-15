import { describe, expect, it } from 'bun:test';
import type { Station, StationDailyPrice, StationRepository, StationType } from '@llenoporfa/common';
import { GetStationsUseCase } from '../src/application/use-cases/stations/GetStationsUseCase';
import { GetStationHistoryUseCase } from '../src/application/use-cases/stations/GetStationHistoryUseCase';

class InMemoryStationRepository implements StationRepository {
  public stations: Station[] = [];
  public dailyPrices: StationDailyPrice[] = [];

  async save(station: Station): Promise<void> {
    this.stations.push(station);
  }
  async saveBatch(stations: Station[]): Promise<void> {
    this.stations.push(...stations);
  }
  async findById(id: string): Promise<Station | null> {
    return this.stations.find((s) => s.id === id) || null;
  }
  async findByExternalId(externalId: string, type: StationType): Promise<Station | null> {
    return this.stations.find((s) => s.externalId === externalId && s.type === type) || null;
  }
  async findInBoundingBox(
    minLat: number,
    maxLat: number,
    minLng: number,
    maxLng: number,
    type?: StationType
  ): Promise<Station[]> {
    return this.stations.filter((s) => {
      const matchType = !type || s.type === type;
      const inBox = s.latitude >= minLat && s.latitude <= maxLat && s.longitude >= minLng && s.longitude <= maxLng;
      return matchType && inBox;
    });
  }
  async findAllActive(type?: StationType): Promise<Station[]> {
    return this.stations.filter((s) => s.isActive && (!type || s.type === type));
  }
  async saveDailyPrice(price: StationDailyPrice): Promise<void> {
    this.dailyPrices.push(price);
  }
  async saveDailyPricesBatch(prices: StationDailyPrice[]): Promise<void> {
    this.dailyPrices.push(...prices);
  }
  async getDailyPricesForStation(stationId: string, limitDays = 30): Promise<StationDailyPrice[]> {
    return this.dailyPrices.filter((p) => p.stationId === stationId).slice(0, limitDays);
  }
  async getDailyAveragePrices(): Promise<{ date: string; avg_g95: number | null; avg_diesel: number | null }[]> {
    return [{ date: '2026-11-15', avg_g95: 1.62, avg_diesel: 1.54 }];
  }
  async countByType(): Promise<Record<StationType, number>> {
    return {
      gas: this.stations.filter((s) => s.type === 'gas').length,
      electric: this.stations.filter((s) => s.type === 'electric').length,
      hydrogen: this.stations.filter((s) => s.type === 'hydrogen').length,
    };
  }
  async getLastSyncTime(): Promise<number | null> {
    return Date.now();
  }
}

describe('GetStationsUseCase', () => {
  it('filters by radius, sorts by price, and computes price tiers', async () => {
    const repo = new InMemoryStationRepository();
    repo.stations = [
      {
        id: 's1',
        externalId: 'ext1',
        type: 'gas',
        name: 'Plenoil Barata',
        brandOrOperator: 'Plenoil',
        address: 'Calle Mayor 1',
        municipality: 'Madrid',
        province: 'Madrid',
        postalCode: '28001',
        latitude: 40.4168,
        longitude: -3.7038,
        isOpen24h: true,
        isActive: true,
        lastSyncedAt: Date.now(),
        prices: {
          g95_e5: 1.45,
          g98_e5: 1.65,
          diesel_a: 1.39,
          diesel_premium: null,
          glp: null,
        },
      },
      {
        id: 's2',
        externalId: 'ext2',
        type: 'gas',
        name: 'Repsol Premium',
        brandOrOperator: 'Repsol',
        address: 'Paseo de la Castellana 100',
        municipality: 'Madrid',
        province: 'Madrid',
        postalCode: '28046',
        latitude: 40.45,
        longitude: -3.69,
        isOpen24h: true,
        isActive: true,
        lastSyncedAt: Date.now(),
        prices: {
          g95_e5: 1.75,
          g98_e5: 1.95,
          diesel_a: 1.69,
          diesel_premium: null,
          glp: null,
        },
      },
    ];

    const useCase = new GetStationsUseCase(repo);
    const res = await useCase.execute({
      lat: 40.4168,
      lng: -3.7038,
      radiusKm: 15,
      fuel: 'g95_e5',
      sort: 'price',
    });

    expect(res.count).toBe(2);
    expect(res.stations[0].brandOrOperator).toBe('Plenoil');
    expect(res.stations[0].priceTier).toBe('low');
    expect(res.stations[1].priceTier).toBe('high');
    expect(res.min_price).toBe(1.45);
    expect(res.max_price).toBe(1.75);
  });

  it('correctly retrieves electric and hydrogen stations', async () => {
    const repo = new InMemoryStationRepository();
    repo.stations = [
      {
        id: 'ev1',
        externalId: 'ext_ev1',
        type: 'electric',
        name: 'Ionity Charger',
        brandOrOperator: 'Ionity',
        address: 'A-2 km 20',
        municipality: 'San Fernando',
        province: 'Madrid',
        postalCode: '28830',
        latitude: 40.45,
        longitude: -3.5,
        isOpen24h: true,
        isActive: true,
        lastSyncedAt: Date.now(),
        prices: {
          g95_e5: null,
          g98_e5: null,
          diesel_a: null,
          diesel_premium: null,
          glp: null,
          electric_kwh: 0.55,
        },
      },
      {
        id: 'h2_1',
        externalId: 'ext_h2_1',
        type: 'hydrogen',
        name: 'Scale Gas H2',
        brandOrOperator: 'Scale Gas',
        address: 'Manoteras 34',
        municipality: 'Madrid',
        province: 'Madrid',
        postalCode: '28050',
        latitude: 40.48,
        longitude: -3.66,
        isOpen24h: false,
        isActive: true,
        lastSyncedAt: Date.now(),
        prices: {
          g95_e5: null,
          g98_e5: null,
          diesel_a: null,
          diesel_premium: null,
          glp: null,
          hydrogen_kg: 10.5,
        },
      },
    ];

    const useCase = new GetStationsUseCase(repo);
    const evRes = await useCase.execute({
      fuel: 'electric_kwh',
    });
    expect(evRes.count).toBe(1);
    expect(evRes.stations[0].type).toBe('electric');

    const h2Res = await useCase.execute({
      fuel: 'hydrogen_kg',
    });
    expect(h2Res.count).toBe(1);
    expect(h2Res.stations[0].type).toBe('hydrogen');
  });
});
