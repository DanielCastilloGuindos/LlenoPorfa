use std::collections::HashSet;
use serde::Deserialize;
use crate::models::{FuelPrices, Station};

pub const MITECO_URL: &str =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

#[derive(Debug, Deserialize, Clone)]
pub struct MitecoEnvelope {
    #[serde(rename = "Fecha")]
    pub fecha: Option<String>,
    #[serde(rename = "ListaEESSPrecio")]
    pub lista_eess_precio: Vec<MitecoRawStation>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct MitecoRawStation {
    #[serde(rename = "IDEESS")]
    pub ideess: String,
    #[serde(rename = "Rótulo")]
    pub rotulo: String,
    #[serde(rename = "Dirección")]
    pub direccion: String,
    #[serde(rename = "Municipio")]
    pub municipio: String,
    #[serde(rename = "Provincia")]
    pub provincia: String,
    #[serde(rename = "C.P.")]
    pub cp: Option<String>,
    #[serde(rename = "Horario")]
    pub horario: String,
    #[serde(rename = "Latitud")]
    pub latitud: String,
    #[serde(rename = "Longitud (WGS84)")]
    pub longitud: String,
    #[serde(rename = "Precio Gasolina 95 E5")]
    pub precio_gasolina_95_e5: Option<String>,
    #[serde(rename = "Precio Gasolina 98 E5")]
    pub precio_gasolina_98_e5: Option<String>,
    #[serde(rename = "Precio Gasoleo A")]
    pub precio_gasoleo_a: Option<String>,
    #[serde(rename = "Precio Gasoleo Premium")]
    pub precio_gasoleo_premium: Option<String>,
    #[serde(rename = "Precio Gases licuados del petróleo")]
    pub precio_glp: Option<String>,
}

/// Parses a string with a Spanish comma decimal separator into an Option<f64>.
pub fn parse_spanish_decimal(val: &Option<String>) -> Option<f64> {
    match val {
        Some(s) => {
            let trimmed = s.trim().replace(',', ".");
            if trimmed.is_empty() {
                None
            } else {
                trimmed.parse::<f64>().ok()
            }
        }
        None => None,
    }
}

/// Helper for direct string slices.
pub fn parse_spanish_str(val: &str) -> Option<f64> {
    let trimmed = val.trim().replace(',', ".");
    if trimmed.is_empty() {
        None
    } else {
        trimmed.parse::<f64>().ok()
    }
}

/// Checks if schedule indicates open 24 hours.
pub fn is_open_24_hours(schedule: &str) -> bool {
    let upper = schedule.to_uppercase();
    upper.contains("24H") || upper.contains("24 H") || upper.contains("00:00-24:00")
}

/// Cleans and formats brand title for consistent UI display.
pub fn normalize_brand(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return "INDEPENDIENTE".to_string();
    }
    // Capitalize first letters or keep well known brands tidy
    let upper = trimmed.to_uppercase();
    if upper.contains("REPSOL") {
        "Repsol".to_string()
    } else if upper.contains("CEPSA") {
        "Cepsa".to_string()
    } else if upper.contains("BP") {
        "BP".to_string()
    } else if upper.contains("SHELL") {
        "Shell".to_string()
    } else if upper.contains("GALP") {
        "Galp".to_string()
    } else if upper.contains("PLENOIL") {
        "Plenoil".to_string()
    } else if upper.contains("BALLENOIL") {
        "Ballenoil".to_string()
    } else if upper.contains("PETROPRIX") {
        "Petroprix".to_string()
    } else if upper.contains("CARREFOUR") {
        "Carrefour".to_string()
    } else if upper.contains("ALCAMPO") {
        "Alcampo".to_string()
    } else if upper.contains("EROSKI") {
        "Eroski".to_string()
    } else {
        // Return title-cased if all uppercase, or as is
        trimmed.to_string()
    }
}

/// Fetches raw MITECO dataset.
pub async fn fetch_raw_miteco() -> Result<MitecoEnvelope, reqwest::Error> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    let res = client
        .get(MITECO_URL)
        .header("Accept", "application/json")
        .header("User-Agent", "llenoPorfa-Vercel-Engine/1.0")
        .send()
        .await?
        .json::<MitecoEnvelope>()
        .await?;

    Ok(res)
}

/// Transforms raw MITECO records into normalized `Station` domain structs.
pub fn normalize_stations(raw_list: Vec<MitecoRawStation>) -> Vec<Station> {
    raw_list
        .into_iter()
        .filter_map(|raw| {
            let lat = parse_spanish_str(&raw.latitud)?;
            let lng = parse_spanish_str(&raw.longitud)?;

            // Sanity check coordinates for Spain and its islands
            if lat < 27.0 || lat > 45.0 || lng < -19.0 || lng > 5.0 {
                return None;
            }

            let g95_e5 = parse_spanish_decimal(&raw.precio_gasolina_95_e5);
            let g98_e5 = parse_spanish_decimal(&raw.precio_gasolina_98_e5);
            let diesel_a = parse_spanish_decimal(&raw.precio_gasoleo_a);
            let diesel_premium = parse_spanish_decimal(&raw.precio_gasoleo_premium);
            let glp = parse_spanish_decimal(&raw.precio_glp);

            let is_24h = is_open_24_hours(&raw.horario);
            let brand = normalize_brand(&raw.rotulo);

            Some(Station {
                id: raw.ideess,
                brand,
                address: raw.direccion.trim().to_string(),
                municipality: raw.municipio.trim().to_string(),
                province: raw.provincia.trim().to_string(),
                postal_code: raw.cp.unwrap_or_default().trim().to_string(),
                schedule: raw.horario.trim().to_string(),
                is_open_24h: is_24h,
                latitude: lat,
                longitude: lng,
                distance_km: None,
                prices: FuelPrices {
                    g95_e5,
                    g98_e5,
                    diesel_a,
                    diesel_premium,
                    glp,
                },
                selected_fuel_price: None,
                price_tier: None,
                smart_score: None,
            })
        })
        .collect()
}

/// Collects all unique popular brands from normalized stations.
pub fn extract_popular_brands(stations: &[Station]) -> Vec<String> {
    let mut brands_set = HashSet::new();
    for st in stations {
        if !st.brand.is_empty() {
            brands_set.insert(st.brand.clone());
        }
    }
    let mut list: Vec<String> = brands_set.into_iter().collect();
    list.sort();
    list
}
