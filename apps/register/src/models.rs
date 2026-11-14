use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    pub id: Option<String>,
    pub created_at: Option<i64>,
    pub device_id: String,
    pub session_id: String,
    pub event_type: String,
    pub station_id: Option<String>,
    pub station_brand: Option<String>,
    pub fuel_type: Option<String>,
    pub province: Option<String>,
    pub lat: Option<f64>,
    pub lng: Option<f64>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum IngestPayload {
    Batch(Vec<TelemetryEvent>),
    WrappedBatch { events: Vec<TelemetryEvent> },
    Single(TelemetryEvent),
}

impl IngestPayload {
    pub fn into_events(self) -> Vec<TelemetryEvent> {
        match self {
            IngestPayload::Batch(events) => events,
            IngestPayload::WrappedBatch { events } => events,
            IngestPayload::Single(event) => vec![event],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunnelMetrics {
    pub app_opens: u64,
    pub searches: u64,
    pub details_viewed: u64,
    pub navigations_started: u64,
    pub confirmed_visits: u64,
    pub refuels_logged: u64,
    pub search_to_nav_rate: f64,
    pub nav_to_visit_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopStationItem {
    pub station_id: String,
    pub brand: String,
    pub province: String,
    pub visits_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopBrandItem {
    pub brand: String,
    pub visits_count: u64,
    pub share_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FuelStatItem {
    pub fuel_type: String,
    pub count: u64,
    pub share_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceStatItem {
    pub device_mode: String, // PWA standalone, Mobile web, Desktop
    pub count: u64,
    pub share_pct: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyTrafficItem {
    pub date: String,
    pub sessions: u64,
    pub confirmed_visits: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatsResponse {
    pub ok: bool,
    pub timeframe_days: u32,
    pub unique_users: u64,
    pub total_sessions: u64,
    pub pwa_percentage: f64,
    pub funnel: FunnelMetrics,
    pub top_stations: Vec<TopStationItem>,
    pub top_brands: Vec<TopBrandItem>,
    pub fuel_distribution: Vec<FuelStatItem>,
    pub device_breakdown: Vec<DeviceStatItem>,
    pub daily_traffic: Vec<DailyTrafficItem>,
    pub storage_mode: String, // "turso_database" or "degraded_logging"
}
