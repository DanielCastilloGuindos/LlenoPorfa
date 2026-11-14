-- ==========================================================
-- llenoPorfa: Telemetry & Verified Visits Database Schema
-- Compatible with Turso / libSQL / SQLite / Supabase
-- ==========================================================

CREATE TABLE IF NOT EXISTS telemetry_events (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,          -- Unix epoch in milliseconds
  device_id TEXT NOT NULL,              -- Pseudonymous random UUID from client localStorage
  session_id TEXT NOT NULL,             -- Session UUID per app lifecycle
  event_type TEXT NOT NULL,             -- app_open | search_performed | station_detail_viewed | navigation_started | station_visit_confirmed | refuel_logged
  station_id TEXT,                      -- Unique station ID (e.g. IDEESS)
  station_brand TEXT,                   -- Station brand (Repsol, Cepsa, etc.)
  fuel_type TEXT,                       -- g95_e5, diesel_a, etc.
  province TEXT,                        -- Province or city name
  lat REAL,                             -- Station / visit latitude
  lng REAL,                             -- Station / visit longitude
  metadata_json TEXT                    -- JSON string with arbitrary event details (filters, platform, liters, app)
);

-- Indices for rapid analytics and reporting queries
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry_events (event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry_events (device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_station_id ON telemetry_events (station_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_brand ON telemetry_events (station_brand);
