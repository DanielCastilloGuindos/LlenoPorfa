import { initDatabase } from '../src/infrastructure/database/client';
import {
  handleGetCrudeHistory,
  handleGetMarket,
} from '../src/presentation/controllers/marketController';

export default async function handler(req: Request) {
  await initDatabase();
  const url = new URL(req.url);

  if (url.pathname.includes('/crude-history') || url.searchParams.get('mode') === 'crude-history') {
    return await handleGetCrudeHistory(url);
  }

  return await handleGetMarket(url);
}
