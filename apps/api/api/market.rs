use std::collections::HashMap;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use api_lib::{error::ApiError, market};

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

    let avg_g95 = query_params.get("avg_g95").and_then(|v| v.parse::<f64>().ok());
    let avg_diesel = query_params.get("avg_diesel").and_then(|v| v.parse::<f64>().ok());
    let range = query_params.get("range").map(|s| s.as_str()).unwrap_or("1mo");

    // 4. In-memory cached or Yahoo Finance fetch
    let points = match market::get_cached_or_fetch_market_points_for_range(range).await {
        Ok(pts) => pts,
        Err(err) => return Ok(err.into_response()),
    };

    // 5. Build market analysis and tax breakdown
    let result = match market::build_market_response(points, avg_g95, avg_diesel) {
        Ok(res) => res,
        Err(err) => return Ok(err.into_response()),
    };

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
        .header("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=600")
        .body(Body::from(body_str))
        .unwrap_or_else(|_| {
            ApiError::Internal("Failed to construct HTTP response".to_string()).into_response()
        });

    Ok(response)
}
