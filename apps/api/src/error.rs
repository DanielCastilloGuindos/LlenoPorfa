use serde::Serialize;
use vercel_runtime::{Body, Response, StatusCode};

#[derive(Debug, Serialize, Clone)]
pub struct ErrorPayload {
    pub ok: bool,
    pub code: String,
    pub error: String,
}

#[derive(Debug)]
pub enum ApiError {
    BadRequest(String),
    MethodNotAllowed,
    UpstreamTimeout(String),
    UpstreamUnavailable(String),
    ParseError(String),
    Internal(String),
}

impl ApiError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST, // 400
            ApiError::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED, // 405
            ApiError::UpstreamTimeout(_) => StatusCode::GATEWAY_TIMEOUT, // 504
            ApiError::UpstreamUnavailable(_) => StatusCode::BAD_GATEWAY, // 502
            ApiError::ParseError(_) => StatusCode::BAD_GATEWAY, // 502
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            ApiError::BadRequest(_) => "BAD_REQUEST",
            ApiError::MethodNotAllowed => "METHOD_NOT_ALLOWED",
            ApiError::UpstreamTimeout(_) => "UPSTREAM_TIMEOUT",
            ApiError::UpstreamUnavailable(_) => "UPSTREAM_UNAVAILABLE",
            ApiError::ParseError(_) => "PARSE_ERROR",
            ApiError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn message(&self) -> String {
        match self {
            ApiError::BadRequest(msg) => msg.clone(),
            ApiError::MethodNotAllowed => {
                "Method not allowed. Only GET and OPTIONS are supported.".to_string()
            }
            ApiError::UpstreamTimeout(msg) => msg.clone(),
            ApiError::UpstreamUnavailable(msg) => msg.clone(),
            ApiError::ParseError(msg) => msg.clone(),
            ApiError::Internal(msg) => msg.clone(),
        }
    }

    pub fn into_response(self) -> Response<Body> {
        let status = self.status_code();
        let payload = ErrorPayload {
            ok: false,
            code: self.code().to_string(),
            error: self.message(),
        };

        let body_json = serde_json::to_string(&payload).unwrap_or_else(|_| {
            "{\"ok\":false,\"code\":\"INTERNAL_ERROR\",\"error\":\"Failed to serialize error payload\"}"
                .to_string()
        });

        Response::builder()
            .status(status)
            .header("Content-Type", "application/json; charset=utf-8")
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .body(Body::from(body_json))
            .unwrap_or_else(|_| {
                Response::new(Body::from(
                    "{\"ok\":false,\"code\":\"INTERNAL_ERROR\",\"error\":\"Failed to construct HTTP response\"}",
                ))
            })
    }
}

impl From<ApiError> for Response<Body> {
    fn from(err: ApiError) -> Self {
        err.into_response()
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code(), self.message())
    }
}

impl std::error::Error for ApiError {}
