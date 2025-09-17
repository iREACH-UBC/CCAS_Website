// js/data.js  – ES-module that fetches pollutant_data.json

const JSON_URL =
  "https://raw.githubusercontent.com/iREACH-UBC/CCAS_Dashboard/main/pollutant_data.json";

let _cache;

/** Return the parsed JSON, caching it after the first fetch */
export async function getSensorData () {
  if (_cache) return _cache;                           // already loaded

  const res = await fetch(JSON_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  _cache = await res.json();
  
  const blacklist = ["MOD-00616", "MOD-00631"];
  _cache.sensors = _cache.sensors.filter(s => !blacklist.includes(s.id));

  return _cache;
}
