use vercel_runtime::{run, Body, Error, Request, Response, StatusCode};
use api_lib::models::{FiltersResponse, FuelOption, SortOption};

#[tokio::main]
async fn main() -> Result<(), Error> {
    run(handler).await
}

pub async fn handler(req: Request) -> Result<Response<Body>, Error> {
    if req.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .body(Body::Empty)?);
    }

    let fuels = vec![
        FuelOption {
            id: "g95_e5".to_string(),
            label: "Gasolina 95 E5".to_string(),
            short_label: "SP 95".to_string(),
        },
        FuelOption {
            id: "diesel_a".to_string(),
            label: "Gasóleo A".to_string(),
            short_label: "Diésel".to_string(),
        },
        FuelOption {
            id: "g98_e5".to_string(),
            label: "Gasolina 98 E5".to_string(),
            short_label: "SP 98".to_string(),
        },
        FuelOption {
            id: "diesel_premium".to_string(),
            label: "Gasóleo Premium".to_string(),
            short_label: "Diésel+".to_string(),
        },
        FuelOption {
            id: "glp".to_string(),
            label: "Gases licuados (GLP)".to_string(),
            short_label: "GLP".to_string(),
        },
    ];

    let popular_brands = vec![
        "Repsol".to_string(),
        "Cepsa".to_string(),
        "BP".to_string(),
        "Shell".to_string(),
        "Galp".to_string(),
        "Plenoil".to_string(),
        "Ballenoil".to_string(),
        "Petroprix".to_string(),
        "Carrefour".to_string(),
        "Alcampo".to_string(),
        "Eroski".to_string(),
    ];

    let radius_options = vec![2.0, 5.0, 10.0, 20.0, 35.0, 50.0];

    let sort_options = vec![
        SortOption {
            id: "price".to_string(),
            label: "Más barata primero".to_string(),
        },
        SortOption {
            id: "distance".to_string(),
            label: "Más cercana primero".to_string(),
        },
        SortOption {
            id: "smart".to_string(),
            label: "Smart (Precio + Desplazamiento)".to_string(),
        },
    ];

    let res = FiltersResponse {
        fuels,
        popular_brands,
        radius_options,
        sort_options,
    };

    let body_str = serde_json::to_string(&res)?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json; charset=utf-8")
        .header("Access-Control-Allow-Origin", "*")
        .header("Cache-Control", "public, s-maxage=900, stale-while-revalidate=300")
        .body(Body::from(body_str))?)
}
