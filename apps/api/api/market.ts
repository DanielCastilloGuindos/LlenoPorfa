import type { IncomingMessage, ServerResponse } from 'node:http';
import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetCrudeHistory,
  handleGetMarket,
} from '../src/presentation/controllers/marketController.js';
import { getRequestUrl, writeWebResponse } from '../src/presentation/http/vercel.js';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDatabase();
  const url = getRequestUrl(req);

  let response: Response;
  if (url.pathname.includes('/crude-history') || url.searchParams.get('mode') === 'crude-history') {
    response = await handleGetCrudeHistory(url);
  } else {
    response = await handleGetMarket(url);
  }

  await writeWebResponse(res, response);
}
