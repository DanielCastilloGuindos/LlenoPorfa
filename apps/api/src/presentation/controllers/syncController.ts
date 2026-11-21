import { SyncGasStationsUseCase } from '../../application/use-cases/sync/SyncGasStationsUseCase.js';
import { SyncElectricStationsUseCase } from '../../application/use-cases/sync/SyncElectricStationsUseCase.js';
import { SyncHydrogenStationsUseCase } from '../../application/use-cases/sync/SyncHydrogenStationsUseCase.js';
import { SyncCrudeOilPriceUseCase } from '../../application/use-cases/sync/SyncCrudeOilPriceUseCase.js';
import { LibSqlStationRepository } from '../../infrastructure/database/LibSqlStationRepository.js';
import { LibSqlMarketRepository } from '../../infrastructure/database/LibSqlMarketRepository.js';
import { corsHeaders } from './stationsController.js';

const stationRepo = new LibSqlStationRepository();
const marketRepo = new LibSqlMarketRepository();

const syncGas = new SyncGasStationsUseCase(stationRepo);
const syncElectric = new SyncElectricStationsUseCase(stationRepo);
const syncHydrogen = new SyncHydrogenStationsUseCase(stationRepo);
const syncCrude = new SyncCrudeOilPriceUseCase(marketRepo);

export async function handleSyncGas(): Promise<Response> {
  const result = await syncGas.execute();
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: corsHeaders,
  });
}

export async function handleSyncElectric(): Promise<Response> {
  const result = await syncElectric.execute();
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: corsHeaders,
  });
}

export async function handleSyncHydrogen(): Promise<Response> {
  const result = await syncHydrogen.execute();
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: corsHeaders,
  });
}

export async function handleSyncCrude(): Promise<Response> {
  const result = await syncCrude.execute();
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: corsHeaders,
  });
}

export async function handleSyncAll(): Promise<Response> {
  const start = Date.now();
  console.log('[SyncController] Executing full sync pipeline (gas, electric, hydrogen, crude)...');

  const [gasRes, electricRes, hydrogenRes, crudeRes] = await Promise.all([
    syncGas.execute(),
    syncElectric.execute(),
    syncHydrogen.execute(),
    syncCrude.execute(),
  ]);

  const allSuccess = gasRes.success && electricRes.success && hydrogenRes.success && crudeRes.success;

  return new Response(
    JSON.stringify({
      success: allSuccess,
      durationMs: Date.now() - start,
      timestamp: Date.now(),
      results: {
        gas: gasRes,
        electric: electricRes,
        hydrogen: hydrogenRes,
        crude: crudeRes,
      },
    }),
    {
      status: allSuccess ? 200 : 207,
      headers: corsHeaders,
    }
  );
}

export async function handleGetSyncStatus(): Promise<Response> {
  const [counts, lastGas, lastElectric, lastHydrogen] = await Promise.all([
    stationRepo.countByType(),
    stationRepo.getLastSyncTime('gas'),
    stationRepo.getLastSyncTime('electric'),
    stationRepo.getLastSyncTime('hydrogen'),
  ]);

  return new Response(
    JSON.stringify({
      activeStations: counts,
      lastSync: {
        gas: lastGas,
        electric: lastElectric,
        hydrogen: lastHydrogen,
      },
      timestamp: Date.now(),
    }),
    {
      status: 200,
      headers: corsHeaders,
    }
  );
}
