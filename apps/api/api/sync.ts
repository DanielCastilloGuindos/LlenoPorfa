import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetSyncStatus,
  handleSyncAll,
  handleSyncCrude,
  handleSyncElectric,
  handleSyncGas,
  handleSyncHydrogen,
} from '../src/presentation/controllers/syncController.js';

export default async function handler(req: Request) {
  await initDatabase();
  const url = new URL(req.url);
  const target = url.searchParams.get('target') || 'all';

  // Optional authorization check with CRON_SECRET for production protection
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}` && url.searchParams.get('secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.pathname.endsWith('/status')) {
    return await handleGetSyncStatus();
  }

  switch (target) {
    case 'gas':
      return await handleSyncGas();
    case 'electric':
      return await handleSyncElectric();
    case 'hydrogen':
      return await handleSyncHydrogen();
    case 'crude':
      return await handleSyncCrude();
    case 'all':
    default:
      return await handleSyncAll();
  }
}
