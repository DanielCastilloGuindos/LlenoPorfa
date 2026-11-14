pub mod haversine;
pub mod models;
pub mod miteco;

use std::cmp::Ordering;
use models::{Coordinates, PriceTier, Station, StationsResponse};

/// Evaluates fuel price for a given fuel identifier
pub fn get_fuel_price(station: &Station, fuel: &str) -> Option<f64> {
    match fuel {
        "g95_e5" | "gasolina95" => station.prices.g95_e5,
        "g98_e5" | "gasolina98" => station.prices.g98_e5,
        "diesel_a" | "gasoleoa" => station.prices.diesel_a,
        "diesel_premium" | "gasoleo_premium" => station.prices.diesel_premium,
        "glp" => station.prices.glp,
        _ => station.prices.g95_e5.or(station.prices.diesel_a),
    }
}

/// Filter, score, and sort stations
pub fn process_stations(
    all_stations: Vec<Station>,
    center_lat: Option<f64>,
    center_lng: Option<f64>,
    radius_km: f64,
    fuel: &str,
    brand_filter: Option<&str>,
    open24h: bool,
    sort_by: &str,
) -> StationsResponse {
    let mut filtered: Vec<Station> = all_stations
        .into_iter()
        .filter_map(|mut station| {
            // Check 24h filter
            if open24h && !station.is_open_24h {
                return None;
            }

            // Check brand filter
            if let Some(bf) = brand_filter {
                if !bf.is_empty() && bf != "all" {
                    if !station.brand.to_lowercase().contains(&bf.to_lowercase()) {
                        return None;
                    }
                }
            }

            // Check fuel availability
            let price = get_fuel_price(&station, fuel)?;
            station.selected_fuel_price = Some(price);

            // Compute distance if coordinates provided
            if let (Some(lat), Some(lng)) = (center_lat, center_lng) {
                let dist = haversine::haversine_distance(lat, lng, station.latitude, station.longitude);
                if dist > radius_km {
                    return None;
                }
                station.distance_km = Some((dist * 10.0).round() / 10.0);
            }

            Some(station)
        })
        .collect();

    // Calculate price statistics
    let prices: Vec<f64> = filtered
        .iter()
        .filter_map(|s| s.selected_fuel_price)
        .collect();

    let (min_price, max_price, avg_price) = if !prices.is_empty() {
        let min = prices.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = prices.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let sum: f64 = prices.iter().sum();
        let avg = sum / (prices.len() as f64);
        (Some(min), Some(max), Some((avg * 1000.0).round() / 1000.0))
    } else {
        (None, None, None)
    };

    // Assign price tiers (low = green, medium = amber, high = red)
    if let (Some(min), Some(max)) = (min_price, max_price) {
        let span = max - min;
        for s in &mut filtered {
            if let Some(price) = s.selected_fuel_price {
                if span < 0.001 {
                    s.price_tier = Some(PriceTier::Low);
                } else {
                    let ratio = (price - min) / span;
                    if ratio <= 0.33 {
                        s.price_tier = Some(PriceTier::Low);
                    } else if ratio <= 0.66 {
                        s.price_tier = Some(PriceTier::Medium);
                    } else {
                        s.price_tier = Some(PriceTier::High);
                    }
                }
            }
        }
    }

    // Smart Score: Economic impact of trip + fuel purchase
    // Assumes 50L refuel + 7L/100km round-trip consumption
    for s in &mut filtered {
        if let (Some(price), Some(dist)) = (s.selected_fuel_price, s.distance_km) {
            let refuel_cost = price * 50.0;
            let trip_liters = (dist * 2.0) * (7.0 / 100.0);
            let trip_cost = trip_liters * price;
            s.smart_score = Some(((refuel_cost + trip_cost) * 100.0).round() / 100.0);
        }
    }

    // Sort stations
    filtered.sort_by(|a, b| match sort_by {
        "distance" => {
            let dist_a = a.distance_km.unwrap_or(f64::INFINITY);
            let dist_b = b.distance_km.unwrap_or(f64::INFINITY);
            dist_a
                .partial_cmp(&dist_b)
                .unwrap_or(Ordering::Equal)
                .then_with(|| {
                    let p_a = a.selected_fuel_price.unwrap_or(f64::INFINITY);
                    let p_b = b.selected_fuel_price.unwrap_or(f64::INFINITY);
                    p_a.partial_cmp(&p_b).unwrap_or(Ordering::Equal)
                })
        }
        "smart" => {
            let score_a = a.smart_score.unwrap_or(f64::INFINITY);
            let score_b = b.smart_score.unwrap_or(f64::INFINITY);
            score_a
                .partial_cmp(&score_b)
                .unwrap_or(Ordering::Equal)
                .then_with(|| {
                    let dist_a = a.distance_km.unwrap_or(f64::INFINITY);
                    let dist_b = b.distance_km.unwrap_or(f64::INFINITY);
                    dist_a.partial_cmp(&dist_b).unwrap_or(Ordering::Equal)
                })
        }
        _ /* "price" */ => {
            let p_a = a.selected_fuel_price.unwrap_or(f64::INFINITY);
            let p_b = b.selected_fuel_price.unwrap_or(f64::INFINITY);
            p_a
                .partial_cmp(&p_b)
                .unwrap_or(Ordering::Equal)
                .then_with(|| {
                    let dist_a = a.distance_km.unwrap_or(f64::INFINITY);
                    let dist_b = b.distance_km.unwrap_or(f64::INFINITY);
                    dist_a.partial_cmp(&dist_b).unwrap_or(Ordering::Equal)
                })
        }
    });

    let count = filtered.len();
    let center = match (center_lat, center_lng) {
        (Some(lat), Some(lng)) => Some(Coordinates { lat, lng }),
        _ => None,
    };

    StationsResponse {
        count,
        fuel: fuel.to_string(),
        radius_km,
        center,
        average_price: avg_price,
        min_price,
        max_price,
        stations: filtered,
    }
}
