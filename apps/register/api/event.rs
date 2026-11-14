use serde_json::json;
use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use register_lib::{db, error::ApiError, models::IngestPayload};

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
            .header("Access-Control-Allow-Methods", "POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .body(Body::Empty)
            .unwrap_or_else(|_| Response::new(Body::Empty)));
    }

    if req.method() != "POST" {
        return Ok(ApiError::MethodNotAllowed.into_response());
    }

    // 2. Parse body
    let body_bytes = req.body();
    if body_bytes.is_empty() {
        return Ok(ApiError::BadRequest("Request body cannot be empty".to_string()).into_response());
    }

    let payload: IngestPayload = match serde_json::from_slice(body_bytes) {
        Ok(p) => p,
        Err(e) => {
            return Ok(ApiError::BadRequest(format!("Failed to parse JSON telemetry event: {}", e)).into_response());
        }
    };

    let events = payload.into_events();
    if events.is_empty() {
        return Ok(ApiError::BadRequest("No telemetry events provided".to_string()).into_response());
    }

    // 3. Insert into Turso or log in degraded mode
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .unwrap_or_default();

    let storage_mode = match db::insert_events(&client, &events).await {
        Ok(mode) => mode,
        Err(err) => {
            println!("[TELEMETRY_INSERT_WARN] {}", err);
            "degraded_fallback".to_string()
        }
    };

    let res_body = json!({
        "ok": true,
        "accepted": events.len(),
        "storage": storage_mode
    });

    let body_str = serde_json::to_string(&res_body).unwrap_or_else(|_| "{\"ok\":true}".to_string());

    let response = Response::builder()
        .status(StatusCode::ACCEPTED)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .body(Body::from(body_str))
        .unwrap_or_else(|_| Response::new(Body::from("{\"ok\":true}")));

    Ok(response)
}
