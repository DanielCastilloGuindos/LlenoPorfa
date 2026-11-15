import type {
  FuelId,
  PriceTier,
  Station,
  StationRepository,
  StationsApiResponse,
  StationsQueryDto,
  StationType,
} from '@llenoporfa/common';
import { calculateBoundingBox, haversineDistance } from '@llenoporfa/common';

export class GetStationsUseCase {
  constructor(private readonly stationRepo: StationRepository) {}

  async execute(query: StationsQueryDto): Promise<StationsApiResponse> {
    const lat = query.lat !== undefined && !isNaN(Number(query.lat)) ? Number(query.lat) : null;
    const lng = query.lng !== undefined && !isNaN(Number(query.lng)) ? Number(query.lng) : null;
    const radius = Math.max(1, Math.min(100, Number(query.radiusKm || 10)));
    const fuel: FuelId = query.fuel || 'g95_e5';
    const brand = query.brand?.trim() || 'all';
    const open24h = Boolean(query.open24h);
    const sort = query.sort || 'price';

    // Auto-detect station type from fuel if not explicitly specified
    let targetType: StationType | undefined = query.type;
    if (!targetType) {
      if (fuel === 'electric_kwh') targetType = 'electric';
      else if (fuel === 'hydrogen_kg') targetType = 'hydrogen';
      else targetType = 'gas';
    }

    let candidates: Station[] = [];

    if (lat !== null && lng !== null) {
      // Query with bounding box around user position + 20% margin
      const bbox = calculateBoundingBox(lat, lng, radius * 1.2);
      candidates = await this.stationRepo.findInBoundingBox(
        bbox.minLat,
        bbox.maxLat,
        bbox.minLng,
        bbox.maxLng,
        targetType
      );
    } else if (
      query.minLat !== undefined &&
      query.maxLat !== undefined &&
      query.minLng !== undefined &&
      query.maxLng !== undefined
    ) {
      candidates = await this.stationRepo.findInBoundingBox(
        query.minLat,
        query.maxLat,
        query.minLng,
        query.maxLng,
        targetType
      );
    } else {
      candidates = await this.stationRepo.findAllActive(targetType);
    }

    // Filter, annotate distance, and extract fuel price
    const filtered: Station[] = [];

    for (const station of candidates) {
      if (open24h && !station.isOpen24h) continue;

      if (brand !== 'all' && !station.brandOrOperator.toLowerCase().includes(brand.toLowerCase())) {
        continue;
      }

      let dist: number | null = null;
      if (lat !== null && lng !== null) {
        dist = haversineDistance(lat, lng, station.latitude, station.longitude);
        if (dist > radius) continue;
      }

      const price = this.getFuelPrice(station, fuel);
      // For fuel stations, if looking for a specific fuel, ensure it has a price
      if (station.type === 'gas' && price === null) continue;

      const distKm = dist !== null ? Math.round(dist * 10) / 10 : null;
      const annotated: Station = {
        ...station,
        distanceKm: distKm,
        distance_km: distKm,
        selectedFuelPrice: price,
        selected_fuel_price: price,
      };

      filtered.push(annotated);
    }

    // Compute price stats and tiers
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    let sumPrice = 0;
    let countPrice = 0;

    for (const s of filtered) {
      const p = s.selected_fuel_price ?? s.selectedFuelPrice;
      if (p !== null && p !== undefined && p > 0) {
        if (minPrice === null || p < minPrice) minPrice = p;
        if (maxPrice === null || p > maxPrice) maxPrice = p;
        sumPrice += p;
        countPrice++;
      }
    }

    const avgPrice = countPrice > 0 ? Math.round((sumPrice / countPrice) * 1000) / 1000 : null;

    // Price tiers & smart scores
    for (const s of filtered) {
      const p = s.selected_fuel_price ?? s.selectedFuelPrice;
      if (p !== null && p !== undefined && minPrice !== null && maxPrice !== null) {
        const span = maxPrice - minPrice;
        if (span <= 0) {
          s.priceTier = 'medium';
          s.price_tier = 'medium';
        } else {
          const ratio = (p - minPrice) / span;
          const tier = ratio <= 0.33 ? 'low' : ratio <= 0.66 ? 'medium' : 'high';
          s.priceTier = tier;
          s.price_tier = tier;
        }
      }

      // Smart score: combined cost (estimated price + ~0.08€ per km travel)
      const d = s.distance_km ?? s.distanceKm;
      if (p !== null && p !== undefined && d !== null && d !== undefined) {
        const score = Math.round((p + d * 0.08) * 1000) / 1000;
        s.smartScore = score;
        s.smart_score = score;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const pA = a.selected_fuel_price ?? a.selectedFuelPrice ?? Infinity;
      const pB = b.selected_fuel_price ?? b.selectedFuelPrice ?? Infinity;
      const dA = a.distance_km ?? a.distanceKm ?? Infinity;
      const dB = b.distance_km ?? b.distanceKm ?? Infinity;
      const sA = a.smart_score ?? a.smartScore ?? Infinity;
      const sB = b.smart_score ?? b.smartScore ?? Infinity;

      if (sort === 'distance') {
        return dA - dB || pA - pB;
      }
      if (sort === 'smart') {
        return sA - sB || dA - dB;
      }
      return pA - pB || dA - dB;
    });

    return {
      count: filtered.length,
      fuel,
      radius_km: radius,
      center: lat !== null && lng !== null ? { lat, lng } : null,
      average_price: avgPrice,
      min_price: minPrice,
      max_price: maxPrice,
      stations: filtered,
    };
  }

  private getFuelPrice(station: Station, fuel: FuelId): number | null {
    switch (fuel) {
      case 'g95_e5':
        return station.prices.g95_e5 ?? null;
      case 'g98_e5':
        return station.prices.g98_e5 ?? null;
      case 'diesel_a':
        return station.prices.diesel_a ?? null;
      case 'diesel_premium':
        return station.prices.diesel_premium ?? null;
      case 'glp':
        return station.prices.glp ?? null;
      case 'gnc':
        return station.prices.gnc ?? null;
      case 'electric_kwh':
        return station.prices.electric_kwh ?? null;
      case 'hydrogen_kg':
        return station.prices.hydrogen_kg ?? null;
      default:
        return station.prices.g95_e5 ?? station.prices.diesel_a ?? null;
    }
  }
}
