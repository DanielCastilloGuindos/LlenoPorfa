use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PriceTier {
    Low,
    Medium,
    High,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct FuelPrices {
    pub g95_e5: Option<f64>,
    pub g98_e5: Option<f64>,
    pub diesel_a: Option<f64>,
    pub diesel_premium: Option<f64>,
    pub glp: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Station {
    pub id: String,
    pub brand: String,
    pub address: String,
    pub municipality: String,
    pub province: String,
    pub postal_code: String,
    pub schedule: String,
    pub is_open_24h: bool,
    pub latitude: f64,
    pub longitude: f64,
    pub distance_km: Option<f64>,
    pub prices: FuelPrices,
    pub selected_fuel_price: Option<f64>,
    pub price_tier: Option<PriceTier>,
    pub smart_score: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StationsResponse {
    pub count: usize,
    pub fuel: String,
    pub radius_km: f64,
    pub center: Option<Coordinates>,
    pub average_price: Option<f64>,
    pub min_price: Option<f64>,
    pub max_price: Option<f64>,
    pub stations: Vec<Station>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Coordinates {
    pub lat: f64,
    pub lng: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FuelOption {
    pub id: String,
    pub label: String,
    pub short_label: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FiltersResponse {
    pub fuels: Vec<FuelOption>,
    pub popular_brands: Vec<String>,
    pub radius_options: Vec<f64>,
    pub sort_options: Vec<SortOption>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SortOption {
    pub id: String,
    pub label: String,
}
