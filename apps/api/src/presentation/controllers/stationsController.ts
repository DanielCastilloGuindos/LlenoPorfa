import type { FuelId, SortMode, StationType } from '@llenoporfa/common';
import { GetStationsUseCase } from '../../application/use-cases/stations/GetStationsUseCase';
import { GetStationHistoryUseCase } from '../../application/use-cases/stations/GetStationHistoryUseCase';
import { LibSqlStationRepository } from '../../infrastructure/database/LibSqlStationRepository';
import { LibSqlMarketRepository } from '../../infrastructure/database/LibSqlMarketRepository';

const stationRepo = new LibSqlStationRepository();
const marketRepo = new LibSqlMarketRepository();
const getStationsUseCase = new GetStationsUseCase(stationRepo);
const getStationHistoryUseCase = new GetStationHistoryUseCase(stationRepo, marketRepo);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function handleGetStations(url: URL): Promise<Response> {
  const lat = url.searchParams.get('lat') ? parseFloat(url.searchParams.get('lat')!) : undefined;
  const lng = url.searchParams.get('lng') ? parseFloat(url.searchParams.get('lng')!) : undefined;
  const radiusKm = url.searchParams.get('radius')
    ? parseFloat(url.searchParams.get('radius')!)
    : undefined;
  const fuel = (url.searchParams.get('fuel') as FuelId) || undefined;
  const type = (url.searchParams.get('type') as StationType) || undefined;
  const brand = url.searchParams.get('brand') || undefined;
  const open24h = url.searchParams.get('open24h') === 'true' || url.searchParams.get('open24h') === '1';
  const sort = (url.searchParams.get('sort') as SortMode) || undefined;

  const minLat = url.searchParams.get('minLat') ? parseFloat(url.searchParams.get('minLat')!) : undefined;
  const maxLat = url.searchParams.get('maxLat') ? parseFloat(url.searchParams.get('maxLat')!) : undefined;
  const minLng = url.searchParams.get('minLng') ? parseFloat(url.searchParams.get('minLng')!) : undefined;
  const maxLng = url.searchParams.get('maxLng') ? parseFloat(url.searchParams.get('maxLng')!) : undefined;

  const res = await getStationsUseCase.execute({
    lat,
    lng,
    radiusKm,
    fuel,
    type,
    brand,
    open24h,
    sort,
    minLat,
    maxLat,
    minLng,
    maxLng,
  });

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  });
}

export async function handleGetStationHistory(stationId: string, url: URL): Promise<Response> {
  const days = url.searchParams.get('days') ? parseInt(url.searchParams.get('days')!, 10) : 30;
  const res = await getStationHistoryUseCase.execute(stationId, days);

  if (!res) {
    return new Response(JSON.stringify({ error: 'Station not found' }), {
      status: 404,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120',
    },
  });
}

export async function handleGetFilters(): Promise<Response> {
  const catalog = {
    fuels: [
      { id: 'g95_e5', label: 'Gasolina 95 E5', short_label: 'SP 95' },
      { id: 'diesel_a', label: 'Gasóleo A', short_label: 'Diésel' },
      { id: 'g98_e5', label: 'Gasolina 98 E5', short_label: 'SP 98' },
      { id: 'diesel_premium', label: 'Gasóleo Premium', short_label: 'Diésel+' },
      { id: 'glp', label: 'Gases licuados (GLP)', short_label: 'GLP' },
      { id: 'gnc', label: 'Gas Natural Comprimido', short_label: 'GNC' },
      { id: 'electric_kwh', label: 'Electricidad (kWh)', short_label: 'EV' },
      { id: 'hydrogen_kg', label: 'Hidrógeno (H2/kg)', short_label: 'H2' },
    ],
    popular_brands: [
      'Repsol',
      'Cepsa',
      'BP',
      'Shell',
      'Galp',
      'Plenoil',
      'Ballenoil',
      'Petroprix',
      'Ionity',
      'Tesla Supercharger',
      'Iberdrola',
      'Endesa X',
    ],
    radius_options: [2, 5, 10, 20, 50],
    sort_options: [
      { id: 'price', label: 'Más barata' },
      { id: 'distance', label: 'Más cercana' },
      { id: 'smart', label: 'Recomendada (Smart)' },
    ],
  };

  return new Response(JSON.stringify(catalog), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
