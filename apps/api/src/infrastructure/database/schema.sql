-- ==========================================================
-- llenoPorfa: Fuel, Electric & Hydrogen Stations + Market Schema
-- Compatible with Turso / libSQL / SQLite
-- ==========================================================

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gas', 'electric', 'hydrogen')),
  name TEXT NOT NULL,
  brand_or_operator TEXT NOT NULL,
  address TEXT NOT NULL,
  municipality TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  schedule TEXT,
  is_open_24h INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_synced_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_ext_type ON stations (external_id, type);
CREATE INDEX IF NOT EXISTS idx_stations_coords ON stations (lat, lng);
CREATE INDEX IF NOT EXISTS idx_stations_type_active ON stations (type, is_active);
CREATE INDEX IF NOT EXISTS idx_stations_brand ON stations (brand_or_operator);

CREATE TABLE IF NOT EXISTS station_daily_prices (
  id TEXT PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  recorded_date TEXT NOT NULL,
  gasoline_95 REAL,
  gasoline_98 REAL,
  diesel_a REAL,
  diesel_premium REAL,
  glp REAL,
  gnc REAL,
  electric_kwh_price REAL,
  hydrogen_kg_price REAL,
  created_at INTEGER NOT NULL,
  UNIQUE(station_id, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_prices_station_date ON station_daily_prices (station_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON station_daily_prices (recorded_date);

CREATE TABLE IF NOT EXISTS crude_oil_daily_prices (
  id TEXT PRIMARY KEY,
  recorded_date TEXT UNIQUE NOT NULL,
  brent_usd REAL NOT NULL,
  wti_usd REAL,
  eur_usd_rate REAL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crude_prices_date ON crude_oil_daily_prices (recorded_date DESC);

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  total_processed INTEGER NOT NULL,
  total_upserted INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs (sync_type, created_at DESC);
