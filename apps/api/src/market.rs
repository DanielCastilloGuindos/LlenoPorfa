use std::sync::OnceLock;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::error::ApiError;

const BRENT_URL: &str = "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1mo";
const EURUSD_URL: &str = "https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1mo";
const CACHE_TTL_SECS: u64 = 3600; // 1 hour
const LITERS_PER_BARREL: f64 = 158.987;

pub const IEH_GASOLINA_95: f64 = 0.47269;
pub const IEH_DIESEL_A: f64 = 0.37900;
pub const IVA_RATE: f64 = 0.21;
pub const DEFAULT_MARGIN_REF: f64 = 0.25;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyMarketPoint {
    pub date: String,
    pub timestamp: i64,
    pub brent_usd: f64,
    pub eur_usd: f64,
    pub crude_eur_barrel: f64,
    pub crude_eur_liter: f64,
}

#[derive(Clone)]
struct CachedMarketData {
    points: Vec<DailyMarketPoint>,
    fetched_at: Instant,
}

static IN_MEMORY_MARKET_CACHE: OnceLock<RwLock<Option<CachedMarketData>>> = OnceLock::new();

fn get_market_cache() -> &'static RwLock<Option<CachedMarketData>> {
    IN_MEMORY_MARKET_CACHE.get_or_init(|| RwLock::new(None))
}

#[derive(Debug, Deserialize)]
struct YahooChartResponse {
    chart: YahooChartContent,
}

#[derive(Debug, Deserialize)]
struct YahooChartContent {
    result: Option<Vec<YahooChartResult>>,
    #[allow(dead_code)]
    error: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct YahooChartResult {
    timestamp: Option<Vec<i64>>,
    indicators: YahooChartIndicators,
}

#[derive(Debug, Deserialize)]
struct YahooChartIndicators {
    quote: Vec<YahooChartQuote>,
}

#[derive(Debug, Deserialize)]
struct YahooChartQuote {
    close: Vec<Option<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelTaxBreakdown {
    pub crude_cost: f64,
    pub crude_pct: f64,
    pub refining_margin: f64,
    pub refining_margin_pct: f64,
    pub ieh: f64,
    pub ieh_pct: f64,
    pub iva: f64,
    pub iva_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelMarketDetails {
    pub name: String,
    pub ieh: f64,
    pub iva_rate: f64,
    pub pvp: f64,
    pub is_real_avg: bool,
    pub breakdown: FuelTaxBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelsMap {
    pub g95_e5: FuelMarketDetails,
    pub diesel_a: FuelMarketDetails,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketResponse {
    pub updated_at: i64,
    pub brent_usd: f64,
    pub eur_usd: f64,
    pub crude_eur_barrel: f64,
    pub crude_eur_liter: f64,
    pub delta_24h_pct: f64,
    pub delta_7d_pct: f64,
    pub trend: String, // "rising" | "falling" | "stable"
    pub trend_message: String,
    pub history: Vec<DailyMarketPoint>,
    pub fuels: FuelsMap,
}

fn timestamp_to_date(ts: i64) -> String {
    let days = ts / 86400;
    let z = days + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1024 + doe / 1461 - doe / 1424) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

fn build_market_http_client() -> Result<reqwest::Client, ApiError> {
    reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (compatible; llenoPorfa/1.0; +https://llenoporfa.com)")
        .timeout(Duration::from_secs(12))
        .connect_timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| ApiError::Internal(format!("Failed to build HTTP client: {}", e)))
}

async fn fetch_yahoo_series(client: &reqwest::Client, url: &str) -> Result<Vec<(i64, f64)>, ApiError> {
    let response = client
        .get(url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                ApiError::UpstreamTimeout(format!("Timeout from Yahoo Finance {}: {}", url, e))
            } else {
                ApiError::UpstreamUnavailable(format!("Network error from Yahoo Finance {}: {}", url, e))
            }
        })?;

    if !response.status().is_success() {
        return Err(ApiError::UpstreamUnavailable(format!(
            "Yahoo Finance HTTP {} from {}",
            response.status(),
            url
        )));
    }

    let payload: YahooChartResponse = response.json().await.map_err(|e| {
        ApiError::ParseError(format!("Failed to deserialize Yahoo Finance response: {}", e))
    })?;

    let result = payload
        .chart
        .result
        .and_then(|mut r| if !r.is_empty() { Some(r.remove(0)) } else { None })
        .ok_or_else(|| ApiError::ParseError("Empty result in Yahoo Finance chart".to_string()))?;

    let timestamps = result
        .timestamp
        .ok_or_else(|| ApiError::ParseError("No timestamps in Yahoo Finance chart".to_string()))?;

    let quotes = result
        .indicators
        .quote
        .into_iter()
        .next()
        .ok_or_else(|| ApiError::ParseError("No quote indicator in Yahoo Finance chart".to_string()))?;

    let mut points: Vec<(i64, f64)> = Vec::new();
    for (ts, close_opt) in timestamps.into_iter().zip(quotes.close.into_iter()) {
        if let Some(val) = close_opt {
            if val > 0.0 && val.is_finite() {
                points.push((ts, val));
            }
        }
    }

    if points.is_empty() {
        return Err(ApiError::ParseError("No valid price points in Yahoo Finance series".to_string()));
    }

    points.sort_by_key(|&(ts, _)| ts);
    Ok(points)
}

pub async fn get_cached_or_fetch_market_points() -> Result<Vec<DailyMarketPoint>, ApiError> {
    let cache = get_market_cache();

    // 1. Check read lock
    {
        let reader = cache.read().await;
        if let Some(cached) = &*reader {
            if cached.fetched_at.elapsed() < Duration::from_secs(CACHE_TTL_SECS) && !cached.points.is_empty() {
                return Ok(cached.points.clone());
            }
        }
    }

    // 2. Fetch fresh data in parallel
    let client = build_market_http_client()?;

    let (brent_res, fx_res) = tokio::join!(
        fetch_yahoo_series(&client, BRENT_URL),
        fetch_yahoo_series(&client, EURUSD_URL)
    );

    let brent_series = brent_res?;
    let fx_series = fx_res?;

    // 3. Pair each Brent day with closest EUR/USD exchange rate
    let mut combined: Vec<DailyMarketPoint> = Vec::new();

    for (brent_ts, brent_price) in brent_series {
        // Find EUR/USD point with smallest time delta
        let best_fx = fx_series
            .iter()
            .min_by_key(|&&(fx_ts, _)| (fx_ts - brent_ts).abs());

        if let Some(&(_, fx_rate)) = best_fx {
            if fx_rate > 0.0 {
                let crude_eur_bbl = brent_price / fx_rate;
                let crude_eur_lit = crude_eur_bbl / LITERS_PER_BARREL;

                combined.push(DailyMarketPoint {
                    date: timestamp_to_date(brent_ts),
                    timestamp: brent_ts,
                    brent_usd: (brent_price * 100.0).round() / 100.0,
                    eur_usd: (fx_rate * 10000.0).round() / 10000.0,
                    crude_eur_barrel: (crude_eur_bbl * 100.0).round() / 100.0,
                    crude_eur_liter: (crude_eur_lit * 1000.0).round() / 1000.0,
                });
            }
        }
    }

    if combined.is_empty() {
        return Err(ApiError::ParseError("Failed to pair Brent and EUR/USD series".to_string()));
    }

    // Sort chronologically ascending
    combined.sort_by_key(|p| p.timestamp);

    // 4. Update in-memory cache
    {
        let mut writer = cache.write().await;
        *writer = Some(CachedMarketData {
            points: combined.clone(),
            fetched_at: Instant::now(),
        });
    }

    Ok(combined)
}

fn calculate_fuel_details(
    name: &str,
    ieh: f64,
    crude_eur_lit: f64,
    avg_price_param: Option<f64>,
) -> FuelMarketDetails {
    let (pvp, is_real_avg, refining_margin) = if let Some(avg) = avg_price_param {
        if avg > 0.5 {
            let base_sin_iva = avg / (1.0 + IVA_RATE);
            let margin = (base_sin_iva - ieh - crude_eur_lit).max(0.0);
            (avg, true, margin)
        } else {
            let margin = DEFAULT_MARGIN_REF;
            let base = crude_eur_lit + ieh + margin;
            let pvp = base * (1.0 + IVA_RATE);
            (pvp, false, margin)
        }
    } else {
        let margin = DEFAULT_MARGIN_REF;
        let base = crude_eur_lit + ieh + margin;
        let pvp = base * (1.0 + IVA_RATE);
        (pvp, false, margin)
    };

    let base_sin_iva = pvp / (1.0 + IVA_RATE);
    let iva = pvp - base_sin_iva;

    let crude_pct = ((crude_eur_lit / pvp) * 100.0 * 10.0).round() / 10.0;
    let refining_pct = ((refining_margin / pvp) * 100.0 * 10.0).round() / 10.0;
    let ieh_pct = ((ieh / pvp) * 100.0 * 10.0).round() / 10.0;
    let iva_pct = ((iva / pvp) * 100.0 * 10.0).round() / 10.0;

    FuelMarketDetails {
        name: name.to_string(),
        ieh: (ieh * 100000.0).round() / 100000.0,
        iva_rate: IVA_RATE,
        pvp: (pvp * 1000.0).round() / 1000.0,
        is_real_avg,
        breakdown: FuelTaxBreakdown {
            crude_cost: (crude_eur_lit * 1000.0).round() / 1000.0,
            crude_pct,
            refining_margin: (refining_margin * 1000.0).round() / 1000.0,
            refining_margin_pct: refining_pct,
            ieh: (ieh * 100000.0).round() / 100000.0,
            ieh_pct,
            iva: (iva * 1000.0).round() / 1000.0,
            iva_pct,
        },
    }
}

pub fn build_market_response(
    points: Vec<DailyMarketPoint>,
    avg_g95: Option<f64>,
    avg_diesel: Option<f64>,
) -> Result<MarketResponse, ApiError> {
    let latest = points.last().ok_or_else(|| {
        ApiError::Internal("Market points list is unexpectedly empty".to_string())
    })?;

    // 24h delta: compare with previous trading point
    let delta_24h_pct = if points.len() >= 2 {
        let prev = &points[points.len() - 2];
        if prev.crude_eur_liter > 0.0 {
            ((latest.crude_eur_liter - prev.crude_eur_liter) / prev.crude_eur_liter) * 100.0
        } else {
            0.0
        }
    } else {
        0.0
    };

    // 7d delta: find point ~7 days prior
    let target_7d_ts = latest.timestamp - (7 * 86400);
    let ref_7d = points
        .iter()
        .filter(|p| p.timestamp <= latest.timestamp)
        .min_by_key(|p| (p.timestamp - target_7d_ts).abs())
        .unwrap_or(latest);

    let delta_7d_pct = if ref_7d.crude_eur_liter > 0.0 {
        ((latest.crude_eur_liter - ref_7d.crude_eur_liter) / ref_7d.crude_eur_liter) * 100.0
    } else {
        0.0
    };

    let delta_24h_pct = (delta_24h_pct * 10.0).round() / 10.0;
    let delta_7d_pct = (delta_7d_pct * 10.0).round() / 10.0;

    let (trend, trend_message) = if delta_7d_pct >= 3.0 {
        (
            "rising".to_string(),
            format!(
                "El crudo ha subido un +{:.1}% esta semana y suele trasladarse al surtidor en 24-72h. Buen momento para llenar antes de que suban los precios.",
                delta_7d_pct
            ),
        )
    } else if delta_7d_pct <= -3.0 {
        (
            "falling".to_string(),
            format!(
                "El crudo está bajando ({:.1}% en 7 días). Conviene esperar o repostar lo justo si no estás en reserva.",
                delta_7d_pct
            ),
        )
    } else {
        (
            "stable".to_string(),
            format!(
                "Precios del crudo estables ({:+.1}% en 7 días). Sin variaciones bruscas previstas en los surtidores.",
                delta_7d_pct
            ),
        )
    };

    let g95_details = calculate_fuel_details("Gasolina 95 E5", IEH_GASOLINA_95, latest.crude_eur_liter, avg_g95);
    let diesel_details = calculate_fuel_details("Gasóleo A", IEH_DIESEL_A, latest.crude_eur_liter, avg_diesel);

    Ok(MarketResponse {
        updated_at: latest.timestamp,
        brent_usd: latest.brent_usd,
        eur_usd: latest.eur_usd,
        crude_eur_barrel: latest.crude_eur_barrel,
        crude_eur_liter: latest.crude_eur_liter,
        delta_24h_pct,
        delta_7d_pct,
        trend,
        trend_message,
        history: points,
        fuels: FuelsMap {
            g95_e5: g95_details,
            diesel_a: diesel_details,
        },
    })
}
