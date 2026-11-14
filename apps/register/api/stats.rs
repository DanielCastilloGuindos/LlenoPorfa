use std::collections::HashMap;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use register_lib::{db, error::ApiError};

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
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .body(Body::Empty)
            .unwrap_or_else(|_| Response::new(Body::Empty)));
    }

    if req.method() != "GET" {
        return Ok(ApiError::MethodNotAllowed.into_response());
    }

    // 2. Authentication via MANAGER_SECRET
    let expected_secret = std::env::var("MANAGER_SECRET")
        .unwrap_or_else(|_| "llenoporfa_admin_2026".to_string());

    let auth_header = req.headers().get("authorization").and_then(|h| h.to_str().ok());
    let is_authorized = match auth_header {
        Some(val) if val.starts_with("Bearer ") => {
            let token = val.trim_start_matches("Bearer ").trim();
            token == expected_secret
        }
        _ => false,
    };

    if !is_authorized {
        return Ok(ApiError::Unauthorized("Invalid or missing Authorization header Bearer token".to_string()).into_response());
    }

    // 3. Query param `days` (default 30)
    let query_str = req.uri().query().unwrap_or_default();
    let query_params: HashMap<String, String> = url::form_urlencoded::parse(query_str.as_bytes())
        .into_owned()
        .collect();

    let days = query_params
        .get("days")
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(30);

    // 4. Query stats
    let stats = db::query_stats(days).await;

    let body_str = serde_json::to_string(&stats).unwrap_or_else(|_| "{\"ok\":false}".to_string());

    let response = Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "no-cache, no-store, must-revalidate")
        .body(Body::from(body_str))
        .unwrap_or_else(|_| Response::new(Body::from("{\"ok\":false}")));

    Ok(response)
}
