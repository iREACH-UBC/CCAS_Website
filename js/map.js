/* js/map.js – ES-module */

import { getSensorData } from './data.js';

const map = L.map('map');

const vchBounds = [[49.0, -123.6], [50.5, -122.0]];
map.fitBounds(vchBounds);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* ── AQHI colour helper ──────────────────────────────────────────── */
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

/* ── Primary pollutant helpers ───────────────────────────────────── */
function normalizeSubscripts(str) {
  const subscriptMap = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9'
  };

  return String(str ?? '').replace(/[₀₁₂₃₄₅₆₇₈₉]/g, ch => subscriptMap[ch] || ch);
}

function canonicalPollutant(primary) {
  const raw = normalizeSubscripts(primary).toUpperCase().replace(/\s+/g, '');

  if (!raw) return null;
  if (raw.includes('PM2.5') || raw.includes('PM25') || raw.includes('PM2_5')) return 'PM2.5';
  if (raw.includes('PM10')) return 'PM10';
  if (raw.includes('PM1.0') || raw.includes('PM1_0') || raw === 'PM1') return 'PM1.0';
  if (raw === 'O3' || raw.includes('OZONE')) return 'O3';
  if (raw === 'NO2' || raw.includes('NITROGENDIOXIDE')) return 'NO2';
  if (raw === 'NO') return 'NO';
  if (raw === 'CO2') return 'CO2';
  if (raw === 'CO' || raw.includes('CARBONMONOXIDE')) return 'CO';

  return normalizeSubscripts(primary);
}

function getPollutantUnit(primary) {
  switch (canonicalPollutant(primary)) {
    case 'PM2.5':
    case 'PM10':
    case 'PM1.0':
      return 'µg/m³';
    case 'O3':
    case 'NO2':
    case 'NO':
      return 'ppb';
    case 'CO':
    case 'CO2':
      return 'ppm';
    default:
      return '';
  }
}

function getPrimaryConcentration(latest, primary) {
  const canon = canonicalPollutant(primary);
  if (!canon) return null;

  const generic =
    latest.primary_concentration ??
    latest.primary_value ??
    latest.primary_conc ??
    latest.primaryConc ??
    latest.primaryValue ??
    null;

  if (generic != null && !Number.isNaN(Number(generic))) {
    return generic;
  }

  switch (canon) {
    case 'PM2.5':
      return latest.pm25 ?? latest.pm2_5 ?? latest.pm2p5 ?? latest['PM2.5'] ?? latest['PM2_5'] ?? latest['PM25'] ?? null;
    case 'PM10':
      return latest.pm10 ?? latest['PM10'] ?? null;
    case 'PM1.0':
      return latest.pm1 ?? latest.pm1_0 ?? latest.pm1p0 ?? latest['PM1.0'] ?? latest['PM1_0'] ?? null;
    case 'O3':
      return latest.o3 ?? latest['O3'] ?? null;
    case 'NO2':
      return latest.no2 ?? latest['NO2'] ?? null;
    case 'NO':
      return latest.no ?? latest['NO'] ?? null;
    case 'CO':
      return latest.co ?? latest['CO'] ?? null;
    case 'CO2':
      return latest.co2 ?? latest['CO2'] ?? null;
    default:
      return null;
  }
}

function formatPrimaryPollutant(latest) {
  const rawPrimary =
    latest.primary ??
    latest.primary_pollutant ??
    latest.primaryPollutant ??
    null;

  if (!rawPrimary) return 'Primary Pollutant: —';

  const primary = canonicalPollutant(rawPrimary);
  const concentration = getPrimaryConcentration(latest, rawPrimary);

  if (concentration == null || Number.isNaN(Number(concentration))) {
    return `Primary Pollutant: ${primary}`;
  }

  const unit = getPollutantUnit(primary);
  return `Primary Pollutant: ${primary} (${Number(concentration).toFixed(1)} ${unit})`;
}

/* ── Legend ──────────────────────────────────────────────────────── */
const isDesktop = window.matchMedia('(min-width: 768px)').matches;

const aqhiLegend = L.control({
  position: isDesktop ? 'topleft' : 'topright'
});

aqhiLegend.onAdd = function () {
  const div = L.DomUtil.create('div', 'aqhi-legend');

  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10.5];
  const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10+'];
  const bands = [
    'Low',
    'Low',
    'Low',
    'Moderate',
    'Moderate',
    'Moderate',
    'High',
    'High',
    'High',
    'Very High'
  ];

  const rows = grades.map((g, i) => `
    <div class="legend-row">
      <span class="swatch" style="background:${getAQHIColor(g)}"></span>
      <span class="legend-value">${labels[i]}</span>
      <span class="legend-band">${bands[i]}</span>
    </div>
  `).join('');

  div.innerHTML = `
    <h4 class="legend-title">
      <span class="legend-heading">AQHI</span>
      <a class="legend-help"
         href="info.html#aqhi"
         aria-label="What is this colour scale? Learn more on the Info page.">
         What’s this?
      </a>
    </h4>
    <div class="legend-list" aria-label="AQHI risk categories">
      ${rows}
    </div>
  `;

  return div;
};

aqhiLegend.addTo(map);

/* ── Fetch JSON and add markers ──────────────────────────────────── */
getSensorData().then(({ sensors, generated_at }) => {
  sensors.forEach(sensor => {
    const { lat, lon, latest } = sensor;
    if (lat == null || lon == null) return;

    console.log('PRIMARY DEBUG', sensor.name ?? sensor.id, latest.primary, latest);

    const marker = L.circleMarker([lat, lon], {
      color: getAQHIColor(latest.aqhi ?? 0),
      radius: 8,
      fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`
      <b>${sensor.name ?? sensor.id}</b><br/>
      AQHI: ${latest.aqhi ?? '—'}<br/>
      ${formatPrimaryPollutant(latest)}<br/>
      <small>${new Date(generated_at).toLocaleString()}</small>
    `);
  });

  document.title += ` – updated ${new Date(generated_at).toLocaleTimeString()}`;
}).catch(err => {
  console.error(err);
  alert('Unable to load pollutant_data.json');
});