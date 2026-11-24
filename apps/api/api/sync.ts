import type { IncomingMessage, ServerResponse } from 'node:http';
import { initDatabase } from '../src/infrastructure/database/client.js';
import {
  handleGetSyncStatus,
  handleSyncAll,
  handleSyncCrude,
  handleSyncElectric,
  handleSyncGas,
  handleSyncHydrogen,
} from '../src/presentation/controllers/syncController.js';
import { getRequestHeader, getRequestUrl, writeWebResponse } from '../src/presentation/http/vercel.js';

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  await initDatabase();
  const url = getRequestUrl(req);
  const target = url.searchParams.get('target') || 'all';

  // Optional authorization check with CRON_SECRET for production protection
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = getRequestHeader(req, 'authorization');
    if (authHeader !== `Bearer ${cronSecret}` && url.searchParams.get('secret') !== cronSecret) {
      await writeWebResponse(res, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));
      return;
    }
  }

  let response: Response;
  if (url.pathname.endsWith('/status')) {
    response = await handleGetSyncStatus();
  } else {
    switch (target) {
      case 'gas':
        response = await handleSyncGas();
        break;
      case 'electric':
        response = await handleSyncElectric();
        break;
      case 'hydrogen':
        response = await handleSyncHydrogen();
        break;
      case 'crude':
        response = await handleSyncCrude();
        break;
      case 'all':
      default:
        response = await handleSyncAll();
        break;
    }
  }

  await writeWebResponse(res, response);
}
