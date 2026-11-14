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
    Unauthorized(String),
    MethodNotAllowed,
    Internal(String),
}

impl ApiError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            ApiError::BadRequest(_) => StatusCode::BAD_REQUEST, // 400
            ApiError::Unauthorized(_) => StatusCode::UNAUTHORIZED, // 401
            ApiError::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED, // 405
            ApiError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR, // 500
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            ApiError::BadRequest(_) => "BAD_REQUEST",
            ApiError::Unauthorized(_) => "UNAUTHORIZED",
            ApiError::MethodNotAllowed => "METHOD_NOT_ALLOWED",
            ApiError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn message(&self) -> String {
        match self {
            ApiError::BadRequest(msg) => msg.clone(),
            ApiError::Unauthorized(msg) => msg.clone(),
            ApiError::MethodNotAllowed => {
                "Method not allowed. Only POST, GET and OPTIONS are supported.".to_string()
            }
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
            "{\"ok\":false,\"code\":\"INTERNAL_ERROR\",\"error\":\"Failed to serialize error\"}".to_string()
        });

        Response::builder()
            .status(status)
            .header("Content-Type", "application/json; charset=utf-8")
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .body(Body::from(body_json))
            .unwrap_or_else(|_| Response::new(Body::from("{\"ok\":false}")))
    }
}

impl From<ApiError> for Response<Body> {
    fn from(err: ApiError) -> Self {
        err.into_response()
    }
}
