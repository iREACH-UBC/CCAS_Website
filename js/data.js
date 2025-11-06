// js/data.js

const JSON_URL =
  "https://raw.githubusercontent.com/iREACH-UBC/CCAS_Dashboard/main/pollutant_data.json";

let _cache;

/** Return the parsed JSON, caching it after the first fetch */
export async function getSensorData () {
  if (_cache) return _cache;

  const res = await fetch(JSON_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);

  _cache = await res.json();

  // Hide specific devices
  const blacklist = ["MOD-00616", "MOD-00628"];
  _cache.sensors = _cache.sensors.filter(s => !blacklist.includes(s.id));

  return _cache;
}

/** Convenience: sensors with an active alert */
export async function getActiveAlertSensors () {
  const { sensors } = await getSensorData();
  return sensors.filter(s => !!s.active_alert);
}

/** Convenience: just names/ids for quick UI */
export async function getActiveAlertLocations () {
  const alerts = await getActiveAlertSensors();
  return alerts.map(s => ({ id: s.id, name: s.name, region: s.region }));
}
