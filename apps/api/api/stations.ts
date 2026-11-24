import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetFilters,
  handleGetStationHistory,
  handleGetStations,
} from '../src/presentation/controllers/stationsController.js';

export default async function handler(req: Request) {
  await initDatabase();
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https';
  const host = req.headers.get('host') || 'localhost';
  const url = new URL(req.url, `${protocol}://${host}`);

  const historyMatch = url.pathname.match(/\/api\/stations\/([^/]+)\/history/);
  const stationIdParam = url.searchParams.get('stationId');

  if (historyMatch) {
    return await handleGetStationHistory(historyMatch[1], url);
  }
  if (stationIdParam) {
    return await handleGetStationHistory(stationIdParam, url);
  }

  return await handleGetStations(url);
}
