const EARTH_RADIUS_KM: f64 = 6371.0;

/// Calculates the great-circle distance between two points in kilometers
/// using the Haversine formula.
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let d_lat = (lat2 - lat1).to_radians();
    let d_lon = (lon2 - lon1).to_radians();

    let rad_lat1 = lat1.to_radians();
    let rad_lat2 = lat2.to_radians();

    let a = (d_lat / 2.0).sin().powi(2)
        + rad_lat1.cos() * rad_lat2.cos() * (d_lon / 2.0).sin().powi(2);

    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_KM * c
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_madrid_to_barcelona() {
        // Madrid Puerta del Sol: 40.4168, -3.7038
        // Barcelona Plaça Catalunya: 41.3870, 2.1700
        let dist = haversine_distance(40.4168, -3.7038, 41.3870, 2.1700);
        // Approximately 505 km
        assert!((dist - 505.0).abs() < 10.0);
    }
}
