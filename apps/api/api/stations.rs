use std::collections::HashMap;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use api_lib::{error::ApiError, miteco, process_stations};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    // 1. CORS Preflight
    if req.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .body(Body::Empty)
            .unwrap_or_else(|_| Response::new(Body::Empty)));
    }

    // 2. Strict method checking
    if req.method() != "GET" {
        return Ok(ApiError::MethodNotAllowed.into_response());
    }

    // 3. Query params parsing
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

    // 4. In-memory cached or resilient upstream fetch
    let all_stations = match miteco::get_cached_or_fetch_stations().await {
        Ok(stations) => stations,
        Err(err) => return Ok(err.into_response()),
    };

    // 5. Filter, score, and sort
    let result = process_stations(
        all_stations,
        lat,
        lng,
        radius,
        fuel,
        brand,
        open24h,
        sort,
    );

    // 6. JSON serialization with zero panic
    let body_str = match serde_json::to_string(&result) {
        Ok(s) => s,
        Err(e) => {
            return Ok(ApiError::Internal(format!("Failed to serialize response: {}", e)).into_response());
        }
    };

    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=300")
        .body(Body::from(body_str))
        .unwrap_or_else(|_| {
            ApiError::Internal("Failed to construct HTTP response".to_string()).into_response()
        });

    Ok(response)
}
