import { serve } from 'bun';
import { initDatabase } from './infrastructure/database/client.js';
import { LibSqlStationRepository } from './infrastructure/database/LibSqlStationRepository.js';
import { startInternalScheduler } from './infrastructure/scheduler/scheduler.js';
import {
  handleGetFilters,
  handleGetStationHistory,
  handleGetStations,
} from './presentation/controllers/stationsController.js';
import {
  handleGetCrudeHistory,
  handleGetMarket,
} from './presentation/controllers/marketController.js';
import {
  handleRegisterEvent,
  handleRegisterStats,
} from './presentation/controllers/registerController.js';
import {
  handleGetSyncStatus,
  handleSyncAll,
  handleSyncCrude,
  handleSyncElectric,
  handleSyncGas,
  handleSyncHydrogen,
} from './presentation/controllers/syncController.js';

const PORT = Number(process.env.PORT) || 3002;

// Initialize SQLite/Turso tables on boot
await initDatabase();
startInternalScheduler();

// Auto-bootstrap initial sync if database is empty
const initialStationRepo = new LibSqlStationRepository();
initialStationRepo.countByType().then((counts) => {
  if (counts.gas === 0 && counts.electric === 0 && counts.hydrogen === 0) {
    console.log('[llenoPorfa-API] Base de datos vacía. Sincronizando catálogo inicial en segundo plano...');
    handleSyncAll().catch((err) => console.error('[Bootstrap Sync Error]', err));
  } else {
    console.log(
      `[llenoPorfa-API] Catálogo listo: ${counts.gas} gasolineras, ${counts.electric} electrolineras, ${counts.hydrogen} hidrogeneras.`
    );
  }
});

const server = serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // Station routes
      if (pathname === '/api/stations' && method === 'GET') {
        return await handleGetStations(url);
      }

      const stationHistoryMatch = pathname.match(/^\/api\/stations\/([^/]+)\/history$/);
      if (stationHistoryMatch && method === 'GET') {
        const stationId = stationHistoryMatch[1];
        return await handleGetStationHistory(stationId, url);
      }

      if (pathname === '/api/filters' && method === 'GET') {
        return await handleGetFilters();
      }

      // Market routes
      if (pathname === '/api/market' && method === 'GET') {
        return await handleGetMarket(url);
      }

      if (pathname === '/api/market/crude-history' && method === 'GET') {
        return await handleGetCrudeHistory(url);
      }

      // Telemetry & Register routes (for local dev parity with apps/register)
      if (pathname === '/api/register/event' && method === 'POST') {
        return await handleRegisterEvent(req);
      }
      if (pathname === '/api/register/stats' && method === 'GET') {
        return await handleRegisterStats(req, url);
      }

      // Sync & Admin routes
      if (pathname === '/api/sync/gas' && method === 'POST') {
        return await handleSyncGas();
      }
      if (pathname === '/api/sync/electric' && method === 'POST') {
        return await handleSyncElectric();
      }
      if (pathname === '/api/sync/hydrogen' && method === 'POST') {
        return await handleSyncHydrogen();
      }
      if (pathname === '/api/sync/crude' && method === 'POST') {
        return await handleSyncCrude();
      }
      if (pathname === '/api/sync/all' && method === 'POST') {
        return await handleSyncAll();
      }
      if (pathname === '/api/sync/status' && method === 'GET') {
        return await handleGetSyncStatus();
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found', path: pathname }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err: any) {
      console.error('[API Server Error]', err);
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
});

console.log(`[llenoPorfa-API] Clean Architecture Server running on http://localhost:${server.port}`);
