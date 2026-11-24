import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetCrudeHistory,
  handleGetMarket,
} from '../src/presentation/controllers/marketController.js';

export default async function handler(req: Request) {
  await initDatabase();
  const protocol = req.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https';
  const host = req.headers.get('host') || 'localhost';
  const url = new URL(req.url, `${protocol}://${host}`);

  if (url.pathname.includes('/crude-history') || url.searchParams.get('mode') === 'crude-history') {
    return await handleGetCrudeHistory(url);
  }

  return await handleGetMarket(url);
}
