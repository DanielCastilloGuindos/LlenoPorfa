import type { Station, StationDailyPrice } from '@llenoporfa/common';
import {
  haversineDistance,
  isOpen24Hours,
  normalizeBrand,
  normalizePostalCode,
  parseSpanishDecimal,
} from '@llenoporfa/common';

const PRIMARY_URL =
  'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const FALLBACK_URL =
  'https://energia.serviciosmin.gob.es/ServiciosRestCarburantes/PreciosCarburantes/EstacionesTerrestres/';

export interface MitecoRawStation {
  IDEESS: string;
  Rótulo: string;
  Dirección: string;
  Municipio: string;
  Provincia: string;
  'C.P.': string;
  Horario: string;
  Latitud: string;
  'Longitud (WGS84)': string;
  'Precio Gasolina 95 E5': string;
  'Precio Gasolina 98 E5': string;
  'Precio Gasoleo A': string;
  'Precio Gasoleo Premium': string;
  'Precio Gases licuados del petróleo': string;
  'Precio Gas Natural Comprimido'?: string;
  'Precio Hidrogeno'?: string;
}

export class MitecoClient {
  async fetchAllStations(): Promise<{ stations: Station[]; prices: StationDailyPrice[] }> {
    let rawData: any = null;
    try {
      const res = await fetch(PRIMARY_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'LlenoPorfa/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Primary MITECO HTTP ${res.status}`);
      rawData = await res.json();
    } catch (err) {
      console.warn('[MitecoClient] Primary endpoint failed, trying fallback...', err);
      const res = await fetch(FALLBACK_URL, {
        headers: { Accept: 'application/json', 'User-Agent': 'LlenoPorfa/1.0' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`Fallback MITECO HTTP ${res.status}`);
      rawData = await res.json();
    }

    const items: MitecoRawStation[] = rawData.ListaEESSPrecio || [];
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    const stations: Station[] = [];
    const prices: StationDailyPrice[] = [];

    for (const item of items) {
      const lat = parseSpanishDecimal(item.Latitud);
      const lng = parseSpanishDecimal(item['Longitud (WGS84)']);
      if (!lat || !lng || !item.IDEESS) continue;

      const g95 = parseSpanishDecimal(item['Precio Gasolina 95 E5']);
      const g98 = parseSpanishDecimal(item['Precio Gasolina 98 E5']);
      const dieselA = parseSpanishDecimal(item['Precio Gasoleo A']);
      const dieselPrem = parseSpanishDecimal(item['Precio Gasoleo Premium']);
      const glp = parseSpanishDecimal(item['Precio Gases licuados del petróleo']);
      const gnc = parseSpanishDecimal(item['Precio Gas Natural Comprimido']);

      const stationId = `miteco_${item.IDEESS.trim()}`;
      const brand = normalizeBrand(item.Rótulo);
      const schedule = (item.Horario || '').trim();
      const open24h = isOpen24Hours(schedule);

      const fuelPrices = {
        g95_e5: g95,
        g98_e5: g98,
        diesel_a: dieselA,
        diesel_premium: dieselPrem,
        glp: glp,
        gnc: gnc,
      };

      stations.push({
        id: stationId,
        externalId: item.IDEESS.trim(),
        type: 'gas',
        name: brand,
        brandOrOperator: brand,
        address: (item.Dirección || '').trim(),
        municipality: (item.Municipio || '').trim(),
        province: (item.Provincia || '').trim(),
        postalCode: normalizePostalCode(item['C.P.']),
        latitude: lat,
        longitude: lng,
        schedule,
        isOpen24h: open24h,
        isActive: true,
        lastSyncedAt: now,
        prices: fuelPrices,
      });

      prices.push({
        id: `${stationId}_${today}`,
        stationId,
        recordedDate: today,
        prices: fuelPrices,
        createdAt: now,
      });
    }

    return { stations, prices };
  }
}
