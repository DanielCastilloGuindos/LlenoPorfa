import {
  DEFAULT_MARGIN_REF,
  IEH_DIESEL_A,
  IEH_GASOLINA_95,
  IVA_RATE,
  LITERS_PER_BARREL,
} from '@llenoporfa/common';
import { GetMarketHistoryUseCase } from '../../application/use-cases/market/GetMarketHistoryUseCase.js';
import { LibSqlMarketRepository } from '../../infrastructure/database/LibSqlMarketRepository.js';
import { LibSqlStationRepository } from '../../infrastructure/database/LibSqlStationRepository.js';
import { corsHeaders } from './stationsController.js';

const marketRepo = new LibSqlMarketRepository();
const stationRepo = new LibSqlStationRepository();
const getMarketHistoryUseCase = new GetMarketHistoryUseCase(marketRepo, stationRepo);

export async function handleGetCrudeHistory(url: URL): Promise<Response> {
  const days = url.searchParams.get('days') ? parseInt(url.searchParams.get('days')!, 10) : 30;
  const res = await getMarketHistoryUseCase.execute(days);

  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}

export async function handleGetMarket(url: URL): Promise<Response> {
  const range = url.searchParams.get('range') || '30d';
  let days = 30;
  if (range === '7d') days = 7;
  else if (range === '90d' || range === '3m') days = 90;
  else if (range === '365d' || range === '1y') days = 365;

  const historyData = await getMarketHistoryUseCase.execute(days);
  const latestCrude = historyData.crude[0] || {
    brent_usd: 82.0,
    eur_usd: 1.085,
    crude_eur_barrel: 75.58,
    crude_eur_liter: 0.475,
  };

  const brentUsd = latestCrude.brent_usd;
  const eurUsd = latestCrude.eur_usd;
  const crudeEurBarrel = latestCrude.crude_eur_barrel;
  const crudeEurLiter = latestCrude.crude_eur_liter;

  // Compute fuel price breakdowns
  const pvpG95 = 1.629;
  const pvpDiesel = 1.549;

  function calculateBreakdown(pvp: number, ieh: number) {
    const iva = Math.round((pvp - pvp / (1 + IVA_RATE)) * 1000) / 1000;
    const baseSinIva = pvp - iva;
    const crudeCost = Math.round(crudeEurLiter * 1000) / 1000;
    const refiningMargin = Math.max(0.05, Math.round((baseSinIva - crudeCost - ieh) * 1000) / 1000);

    return {
      crude_cost: crudeCost,
      crude_pct: Math.round((crudeCost / pvp) * 1000) / 10,
      refining_margin: refiningMargin,
      refining_margin_pct: Math.round((refiningMargin / pvp) * 1000) / 10,
      ieh: ieh,
      ieh_pct: Math.round((ieh / pvp) * 1000) / 10,
      iva: iva,
      iva_pct: Math.round((iva / pvp) * 1000) / 10,
    };
  }

  // Calculate 24h and 7d deltas from history
  const points = historyData.crude;
  const nowTs = Math.floor(Date.now() / 1000);
  const target24h = nowTs - 86400;
  const target7d = nowTs - 7 * 86400;

  let ref24h = points[0] || latestCrude;
  let ref7d = points[0] || latestCrude;

  if (points.length > 1) {
    ref24h = points.reduce((prev, curr) =>
      Math.abs(curr.timestamp - target24h) < Math.abs(prev.timestamp - target24h) ? curr : prev
    );
    ref7d = points.reduce((prev, curr) =>
      Math.abs(curr.timestamp - target7d) < Math.abs(prev.timestamp - target7d) ? curr : prev
    );
  }

  const delta24hPct =
    ref24h.crude_eur_liter > 0
      ? Math.round(((crudeEurLiter - ref24h.crude_eur_liter) / ref24h.crude_eur_liter) * 1000) / 10
      : 0.0;

  const delta7dPct =
    ref7d.crude_eur_liter > 0
      ? Math.round(((crudeEurLiter - ref7d.crude_eur_liter) / ref7d.crude_eur_liter) * 1000) / 10
      : 0.0;

  let trend: 'rising' | 'falling' | 'stable' = 'stable';
  let trendMessage = `Precios del crudo estables (${delta7dPct >= 0 ? '+' : ''}${delta7dPct}% en 7 días).`;

  if (delta7dPct >= 3.0) {
    trend = 'rising';
    trendMessage = `El crudo ha subido un +${delta7dPct}% esta semana. Buen momento para llenar antes de que suban los precios.`;
  } else if (delta7dPct <= -3.0) {
    trend = 'falling';
    trendMessage = `El crudo está bajando (${delta7dPct}% en 7 días). Conviene esperar si no estás en reserva.`;
  }

  const responsePayload = {
    updated_at: Math.floor(Date.now() / 1000),
    brent_usd: brentUsd,
    eur_usd: eurUsd,
    crude_eur_barrel: crudeEurBarrel,
    crude_eur_liter: crudeEurLiter,
    delta_24h_pct: delta24hPct,
    delta_7d_pct: delta7dPct,
    trend,
    trend_message: trendMessage,
    fuels: {
      g95_e5: {
        name: 'Gasolina 95 E5',
        ieh: IEH_GASOLINA_95,
        iva_rate: IVA_RATE,
        pvp: pvpG95,
        is_real_avg: true,
        breakdown: calculateBreakdown(pvpG95, IEH_GASOLINA_95),
      },
      diesel_a: {
        name: 'Gasóleo A',
        ieh: IEH_DIESEL_A,
        iva_rate: IVA_RATE,
        pvp: pvpDiesel,
        is_real_avg: true,
        breakdown: calculateBreakdown(pvpDiesel, IEH_DIESEL_A),
      },
    },
    history: historyData.crude,
  };

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}
