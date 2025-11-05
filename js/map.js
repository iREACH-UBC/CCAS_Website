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

/* ── Legend: fixed AQHI colour scale (1–10+) ───────────────────────── */
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'aqhi-legend');
  const grades = [1,2,3,4,5,6,7,8,9,10.5];   // 10.5 → use "10+" colour
  const labels = ['1','2','3','4','5','6','7','8','9','10+'];

  const swatches = grades
    .map(g => `<span class="swatch" style="background:${getAQHIColor(g)}"></span>`)
    .join('');

    div.innerHTML = `
      <h4 class="legend-title">
        <span>AQHI</span>
        <a class="legend-help"
           href="info.html#aqhi"
           aria-label="What is this colour scale? Learn more on the Info page.">
           What’s this?
        </a>
      </h4>
      <div class="swatches">${swatches}</div>
      <div class="ticks">${labels.map(l => `<span>${l}</span>`).join('')}</div>
      <div class="bands" aria-label="AQHI risk categories">
        <span class="low">Low (1–3)</span>
        <span class="moderate">Moderate (4–6)</span>
        <span class="high">High (7–9)</span>
        <span class="vhigh">Very High (10+)</span>
      </div>
  `;
  return div;
};

legend.addTo(map);


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
