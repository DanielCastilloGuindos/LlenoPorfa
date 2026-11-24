import type { IncomingMessage, ServerResponse } from 'node:http';
import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetFilters,
  handleGetStationHistory,
  handleGetStations,
} from '../src/presentation/controllers/stationsController.js';
import { getRequestUrl, writeWebResponse } from '../src/presentation/http/vercel.js';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDatabase();
  const url = getRequestUrl(req);

  let response: Response;
  const historyMatch = url.pathname.match(/\/api\/stations\/([^/]+)\/history/);
  const stationIdParam = url.searchParams.get('stationId');

  if (historyMatch) {
    response = await handleGetStationHistory(historyMatch[1], url);
  } else if (stationIdParam) {
    response = await handleGetStationHistory(stationIdParam, url);
  } else {
    response = await handleGetStations(url);
  }

  await writeWebResponse(res, response);
}
