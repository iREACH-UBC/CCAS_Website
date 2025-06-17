/* js/map.js  – ES-module */

import { getSensorData } from './data.js';

const map = L.map('map')
  .addLayer(L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'))

// approximate VCH bounds: SW corner at ~49.0° N, –123.6° W; NE at ~50.5° N, –122.0° W
const vchBounds = [[49.0, -123.6], [50.5, -122.0]]
map.fitBounds(vchBounds)


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* ── 2.  Colour helper for AQHI bands ─────────────────────────────── */
function getAQHIColor(aqhi) {
  if (aqhi <= 1) return '#67c1f1';
  if (aqhi <= 2) return '#4e95c7';
  if (aqhi <= 3) return '#396798';
  if (aqhi <= 4) return '#e7eb38';
  if (aqhi <= 5) return '#f1cb2e';
  if (aqhi <= 6) return '#e79647';
  if (aqhi <= 7) return '#dd6869';
  if (aqhi <= 8) return '#d82732';
  if (aqhi <= 9) return '#bf2733';
  return '#8b2328';
}

/* ── 3.  Fetch JSON once and add markers ──────────────────────────── */
getSensorData().then(({ sensors, generated_at }) => {
  sensors.forEach(sensor => {
    const { lat, lon, latest } = sensor;
    if (lat == null || lon == null) return;          // skip if no coords

    const marker = L.circleMarker([lat, lon], {
      color: getAQHIColor(latest.aqhi ?? 0),
      radius: 8,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>${sensor.name ?? sensor.id}</b><br/>
      AQHI: ${latest.aqhi ?? '—'}<br/>
      Primary Pollutant: ${latest.primary ?? '—'}<br/>
      <small>${new Date(generated_at).toLocaleString()}</small>
    `);
  });

  // Optional: show last JSON build time in page title
  document.title += ` – updated ${new Date(generated_at).toLocaleTimeString()}`;
}).catch(err => {
  console.error(err);
  alert('Unable to load pollutant_data.json');
});
