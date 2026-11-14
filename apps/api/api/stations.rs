use std::collections::HashMap;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use api_lib::{miteco, process_stations};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // Handle CORS preflight
    if req.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .body(Body::Empty)?);
    }

    let query_str = req.uri().query().unwrap_or_default();
    let query_params: HashMap<String, String> = url::form_urlencoded::parse(query_str.as_bytes())
        .into_owned()
        .collect();

    let lat = query_params.get("lat").and_then(|v| v.parse::<f64>().ok());
    let lng = query_params.get("lng").and_then(|v| v.parse::<f64>().ok());
    let radius = query_params.get("radius").and_then(|v| v.parse::<f64>().ok()).unwrap_or(10.0);
    let fuel = query_params.get("fuel").map(|s| s.as_str()).unwrap_or("g95_e5");
    let brand = query_params.get("brand").map(|s| s.as_str());
    let open24h = query_params.get("open24h").map(|v| v == "true" || v == "1").unwrap_or(false);
    let sort = query_params.get("sort").map(|s| s.as_str()).unwrap_or("price");

    let raw = match miteco::fetch_raw_miteco().await {
        Ok(data) => data,
        Err(e) => {
            let error_json = serde_json::json!({
                "error": "Failed to fetch MITECO upstream data",
                "details": e.to_string()
            });
            return Ok(Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(Body::from(error_json.to_string()))?);
        }
    };

    let normalized = miteco::normalize_stations(raw.lista_eess_precio);
    let result = process_stations(
        normalized,
        lat,
        lng,
        radius,
        fuel,
        brand,
        open24h,
        sort,
    );

    let body_str = match serde_json::to_string(&result) {
        Ok(s) => s,
        Err(e) => {
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .header("Content-Type", "application/json")
                .body(Body::from(format!("{{\"error\":\"{}\"}}", e)))?);
        }
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=300")
        .body(Body::from(body_str))?)
}
