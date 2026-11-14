// Dev server for Bun when developing locally without Vercel CLI
import { serve } from "bun";

const MITECO_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

function parseSpanishFloat(str: string | null | undefined): number | null {
  if (!str) return null;
  const clean = str.trim().replace(",", ".");
  if (!clean) return null;
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeBrand(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper.includes("REPSOL")) return "Repsol";
  if (upper.includes("CEPSA")) return "Cepsa";
  if (upper.includes("BP")) return "BP";
  if (upper.includes("SHELL")) return "Shell";
  if (upper.includes("GALP")) return "Galp";
  if (upper.includes("PLENOIL")) return "Plenoil";
  if (upper.includes("BALLENOIL")) return "Ballenoil";
  if (upper.includes("PETROPRIX")) return "Petroprix";
  if (upper.includes("CARREFOUR")) return "Carrefour";
  if (upper.includes("ALCAMPO")) return "Alcampo";
  if (upper.includes("EROSKI")) return "Eroski";
  return raw.trim() || "Independiente";
}

async function getMitecoData() {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedData;
  }
  const res = await fetch(MITECO_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "llenoPorfa-BunDev/1.0",
    },
  });
  if (!res.ok) throw new Error(`MITECO returned ${res.status}`);
  const json: any = await res.json();
  cachedData = json.ListaEESSPrecio || [];
  cacheTimestamp = now;
  return cachedData;
}

const PORT = 3001;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
      "Content-Type": "application/json; charset=utf-8",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/filters") {
      return new Response(
        JSON.stringify({
          fuels: [
            { id: "g95_e5", label: "Gasolina 95 E5", short_label: "SP 95" },
            { id: "diesel_a", label: "Gasóleo A", short_label: "Diésel" },
            { id: "g98_e5", label: "Gasolina 98 E5", short_label: "SP 98" },
            { id: "diesel_premium", label: "Gasóleo Premium", short_label: "Diésel+" },
            { id: "glp", label: "Gases licuados (GLP)", short_label: "GLP" },
          ],
          popular_brands: [
            "Repsol", "Cepsa", "BP", "Shell", "Galp",
            "Plenoil", "Ballenoil", "Petroprix", "Carrefour", "Alcampo", "Eroski"
          ],
          radius_options: [2, 5, 10, 20, 35, 50],
          sort_options: [
            { id: "price", label: "Más barata primero" },
            { id: "distance", label: "Más cercana primero" },
            { id: "smart", label: "Smart (Precio + Desplazamiento)" },
          ],
        }),
        { headers: corsHeaders }
      );
    }

    if (url.pathname === "/api/stations") {
      try {
        const rawList = await getMitecoData();
        const lat = url.searchParams.get("lat") ? parseFloat(url.searchParams.get("lat")!) : null;
        const lng = url.searchParams.get("lng") ? parseFloat(url.searchParams.get("lng")!) : null;
        const radius = url.searchParams.get("radius") ? parseFloat(url.searchParams.get("radius")!) : 10;
        const fuel = url.searchParams.get("fuel") || "g95_e5";
        const brand = url.searchParams.get("brand") || null;
        const open24h = url.searchParams.get("open24h") === "true";
        const sort = url.searchParams.get("sort") || "price";

        const fuelFieldMap: Record<string, string> = {
          g95_e5: "Precio Gasolina 95 E5",
          g98_e5: "Precio Gasolina 98 E5",
          diesel_a: "Precio Gasoleo A",
          diesel_premium: "Precio Gasoleo Premium",
          glp: "Precio Gases licuados del petróleo",
        };

        const targetField = fuelFieldMap[fuel] || "Precio Gasolina 95 E5";

        let filtered = [];

        for (const raw of rawList) {
          const sLat = parseSpanishFloat(raw["Latitud"]);
          const sLng = parseSpanishFloat(raw["Longitud (WGS84)"]);
          if (!sLat || !sLng) continue;

          // Open 24h filter
          const schedule = raw["Horario"] || "";
          const is24h = schedule.toUpperCase().includes("24H") || schedule.includes("00:00-24:00");
          if (open24h && !is24h) continue;

          // Brand filter
          const brandName = normalizeBrand(raw["Rótulo"] || "");
          if (brand && brand !== "all" && !brandName.toLowerCase().includes(brand.toLowerCase())) {
            continue;
          }

          // Fuel price
          const price = parseSpanishFloat(raw[targetField]);
          if (!price || price <= 0) continue;

          // Distance
          let distanceKm: number | null = null;
          if (lat !== null && lng !== null) {
            distanceKm = haversine(lat, lng, sLat, sLng);
            if (distanceKm > radius) continue;
            distanceKm = Math.round(distanceKm * 10) / 10;
          }

          filtered.push({
            id: raw["IDEESS"],
            brand: brandName,
            address: (raw["Dirección"] || "").trim(),
            municipality: (raw["Municipio"] || "").trim(),
            province: (raw["Provincia"] || "").trim(),
            postal_code: (raw["C.P."] || "").trim(),
            schedule: schedule.trim(),
            is_open_24h: is24h,
            latitude: sLat,
            longitude: sLng,
            distance_km: distanceKm,
            prices: {
              g95_e5: parseSpanishFloat(raw["Precio Gasolina 95 E5"]),
              g98_e5: parseSpanishFloat(raw["Precio Gasolina 98 E5"]),
              diesel_a: parseSpanishFloat(raw["Precio Gasoleo A"]),
              diesel_premium: parseSpanishFloat(raw["Precio Gasoleo Premium"]),
              glp: parseSpanishFloat(raw["Precio Gases licuados del petróleo"]),
            },
            selected_fuel_price: price,
            price_tier: null as "low" | "medium" | "high" | null,
            smart_score: distanceKm !== null ? Math.round((price * 50 + (distanceKm * 2 * 0.07 * price)) * 100) / 100 : null,
          });
        }

        // Price statistics & tiers
        const prices = filtered.map((s) => s.selected_fuel_price);
        const minPrice = prices.length ? Math.min(...prices) : null;
        const maxPrice = prices.length ? Math.max(...prices) : null;
        const avgPrice = prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 1000) / 1000 : null;

        if (minPrice !== null && maxPrice !== null) {
          const span = maxPrice - minPrice;
          for (const s of filtered) {
            if (span < 0.001) {
              s.price_tier = "low";
            } else {
              const ratio = (s.selected_fuel_price - minPrice) / span;
              s.price_tier = ratio <= 0.33 ? "low" : ratio <= 0.66 ? "medium" : "high";
            }
          }
        }

        // Sort
        filtered.sort((a, b) => {
          if (sort === "distance") {
            const dA = a.distance_km ?? Infinity;
            const dB = b.distance_km ?? Infinity;
            return dA - dB || a.selected_fuel_price - b.selected_fuel_price;
          }
          if (sort === "smart") {
            const sA = a.smart_score ?? Infinity;
            const sB = b.smart_score ?? Infinity;
            return sA - sB || (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
          }
          return a.selected_fuel_price - b.selected_fuel_price || (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
        });

        return new Response(
          JSON.stringify({
            count: filtered.length,
            fuel,
            radius_km: radius,
            center: lat !== null && lng !== null ? { lat, lng } : null,
            average_price: avgPrice,
            min_price: minPrice,
            max_price: maxPrice,
            stations: filtered,
          }),
          { headers: corsHeaders }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: corsHeaders,
    });
  },
});

console.log(`[llenoPorfa-API] Dev server running at http://localhost:${PORT}`);
