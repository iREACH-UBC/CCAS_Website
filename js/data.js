// js/data.js
const JSON_URL =
  "https://raw.githubusercontent.com/iREACH-UBC/CCAS_Dashboard/main/pollutant_data.json";

const DEFAULT_MAX_AGE_MS = 60_000 *15; // Refresh once every 15 minutes

let _cache = null;
let _cacheTimeMs = 0;

/** Clear the in-memory cache so the next call refetches */
export function invalidateSensorDataCache() {
  _cache = null;
  _cacheTimeMs = 0;
}

/**
 * Return parsed JSON, with optional force refresh and TTL.
 * - force=true bypasses _cache immediately
 * - maxAgeMs controls how long _cache is considered fresh
 */
export async function getSensorData({ force = false, maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const now = Date.now();

  if (!force && _cache && (now - _cacheTimeMs) < maxAgeMs) {
    return _cache;
  }

  // "no-cache" means revalidate before reuse (often preferable for JSON)
  // vs "no-store" which avoids storing entirely. :contentReference[oaicite:1]{index=1}
  const res = await fetch(JSON_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  const json = await res.json();

  // Hide specific devices
  const blacklist = ["MOD-00616", "MOD-00628"];
  json.sensors = (json.sensors || []).filter(s => !blacklist.includes(s.id));

  _cache = json;
  _cacheTimeMs = now;
  return _cache;
}

export async function getActiveAlertSensors (opts = {}) {
  const json = await getSensorData(opts);
  const sensors = json?.sensors ?? [];
  return sensors.filter(s => s?.active_alert);
}

