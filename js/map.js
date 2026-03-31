/* js/map.js – ES-module */

import { getSensorData } from './data.js';

const map = L.map('map');

const vchBounds = [[49.0, -123.6], [50.5, -122.0]];
map.fitBounds(vchBounds);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

/* ── Helpers ─────────────────────────────────────────────────────── */

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

function colorFromBins(value, bins, colors) {
  if (value == null || Number.isNaN(Number(value))) return '#9aa0a6';
  const v = Number(value);

  for (let i = 0; i < bins.length; i++) {
    if (v <= bins[i]) return colors[i];
  }
  return colors[colors.length - 1];
}

function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function getPollutantUnit(key) {
  switch (key) {
    case 'pm25':
      return 'µg/m³';
    case 'o3':
    case 'no2':
    case 'no':
      return 'ppb';
    case 'co':
    case 'co2':
      return 'ppm';
    default:
      return '';
  }
}

function canonicalPollutantName(name) {
  const raw = String(name ?? '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'PM2.5' || raw === 'PM25' || raw === 'PM2_5') return 'pm25';
  if (raw === 'O3') return 'o3';
  if (raw === 'NO2') return 'no2';
  if (raw === 'NO') return 'no';
  if (raw === 'CO') return 'co';
  if (raw === 'CO2') return 'co2';
  return raw.toLowerCase();
}

function displayPollutantName(key) {
  switch (key) {
    case 'pm25': return 'PM2.5';
    case 'o3': return 'O3';
    case 'no2': return 'NO2';
    case 'no': return 'NO';
    case 'co': return 'CO';
    case 'co2': return 'CO2';
    default: return key ?? '—';
  }
}

function getPollutantValue(latest, key) {
  const pollutants = latest?.pollutants ?? {};
  return pollutants[key] ?? null;
}

function formatPrimaryPollutant(latest) {
  const primaryKey = canonicalPollutantName(
    latest?.primary ?? latest?.primary_pollutant ?? latest?.primaryPollutant
  );

  if (!primaryKey) return 'Primary Pollutant: —';

  const value = getPollutantValue(latest, primaryKey);
  const unit = getPollutantUnit(primaryKey);
  const label = displayPollutantName(primaryKey);

  if (value == null || Number.isNaN(Number(value))) {
    return `Primary Pollutant: ${label}`;
  }

  return `Primary Pollutant: ${label} (${formatNumber(value)} ${unit})`;
}

/* ── Layer configs ───────────────────────────────────────────────── */

const pollutantScaleColors = [
  '#67c1f1',
  '#4e95c7',
  '#396798',
  '#e7eb38',
  '#f1cb2e',
  '#dd6869'
];

const LAYER_CONFIG = {
  aqhi: {
    label: 'AQHI',
    getValue: latest => latest?.aqhi ?? null,
    getColor: value => getAQHIColor(value),
    legendRows: [
      { color: getAQHIColor(1), label: '1–3', band: 'Low' },
      { color: getAQHIColor(4), label: '4–6', band: 'Moderate' },
      { color: getAQHIColor(7), label: '7–9', band: 'High' },
      { color: getAQHIColor(10.5), label: '10+', band: 'Very High' }
    ],
    note: ''
  },

  pm25: {
    label: 'PM2.5',
    getValue: latest => getPollutantValue(latest, 'pm25'),
    getColor: value => colorFromBins(value, [5, 10, 20, 35, 55], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–5', band: 'µg/m³' },
      { color: pollutantScaleColors[1], label: '5–10', band: 'µg/m³' },
      { color: pollutantScaleColors[2], label: '10–20', band: 'µg/m³' },
      { color: pollutantScaleColors[3], label: '20–35', band: 'µg/m³' },
      { color: pollutantScaleColors[4], label: '35–55', band: 'µg/m³' },
      { color: pollutantScaleColors[5], label: '55+', band: 'µg/m³' }
    ],
    note: 'Example scale'
  },

  o3: {
    label: 'O3',
    getValue: latest => getPollutantValue(latest, 'o3'),
    getColor: value => colorFromBins(value, [20, 40, 60, 80, 100], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–20', band: 'ppb' },
      { color: pollutantScaleColors[1], label: '20–40', band: 'ppb' },
      { color: pollutantScaleColors[2], label: '40–60', band: 'ppb' },
      { color: pollutantScaleColors[3], label: '60–80', band: 'ppb' },
      { color: pollutantScaleColors[4], label: '80–100', band: 'ppb' },
      { color: pollutantScaleColors[5], label: '100+', band: 'ppb' }
    ],
    note: 'Example scale'
  },

  no2: {
    label: 'NO2',
    getValue: latest => getPollutantValue(latest, 'no2'),
    getColor: value => colorFromBins(value, [10, 20, 30, 50, 80], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–10', band: 'ppb' },
      { color: pollutantScaleColors[1], label: '10–20', band: 'ppb' },
      { color: pollutantScaleColors[2], label: '20–30', band: 'ppb' },
      { color: pollutantScaleColors[3], label: '30–50', band: 'ppb' },
      { color: pollutantScaleColors[4], label: '50–80', band: 'ppb' },
      { color: pollutantScaleColors[5], label: '80+', band: 'ppb' }
    ],
    note: 'Example scale'
  },

  no: {
    label: 'NO',
    getValue: latest => getPollutantValue(latest, 'no'),
    getColor: value => colorFromBins(value, [5, 10, 20, 40, 80], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–5', band: 'ppb' },
      { color: pollutantScaleColors[1], label: '5–10', band: 'ppb' },
      { color: pollutantScaleColors[2], label: '10–20', band: 'ppb' },
      { color: pollutantScaleColors[3], label: '20–40', band: 'ppb' },
      { color: pollutantScaleColors[4], label: '40–80', band: 'ppb' },
      { color: pollutantScaleColors[5], label: '80+', band: 'ppb' }
    ],
    note: 'Example scale'
  },

  co: {
    label: 'CO',
    getValue: latest => getPollutantValue(latest, 'co'),
    getColor: value => colorFromBins(value, [0.2, 0.4, 0.8, 1.5, 3], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–0.2', band: 'ppm' },
      { color: pollutantScaleColors[1], label: '0.2–0.4', band: 'ppm' },
      { color: pollutantScaleColors[2], label: '0.4–0.8', band: 'ppm' },
      { color: pollutantScaleColors[3], label: '0.8–1.5', band: 'ppm' },
      { color: pollutantScaleColors[4], label: '1.5–3', band: 'ppm' },
      { color: pollutantScaleColors[5], label: '3+', band: 'ppm' }
    ],
    note: 'Example scale'
  },

  co2: {
    label: 'CO2',
    getValue: latest => getPollutantValue(latest, 'co2'),
    getColor: value => colorFromBins(value, [500, 700, 900, 1200, 2000], pollutantScaleColors),
    legendRows: [
      { color: pollutantScaleColors[0], label: '0–500', band: 'ppm' },
      { color: pollutantScaleColors[1], label: '500–700', band: 'ppm' },
      { color: pollutantScaleColors[2], label: '700–900', band: 'ppm' },
      { color: pollutantScaleColors[3], label: '900–1200', band: 'ppm' },
      { color: pollutantScaleColors[4], label: '1200–2000', band: 'ppm' },
      { color: pollutantScaleColors[5], label: '2000+', band: 'ppm' }
    ],
    note: 'Example scale'
  }
};

/* ── Minimisable legend ──────────────────────────────────────────── */

const isDesktop = window.matchMedia('(min-width: 768px)').matches;
let currentMode = 'aqhi';
let legendCollapsed = false;
let legendContainer = null;

function renderLegend() {
  if (!legendContainer) return;

  const cfg = LAYER_CONFIG[currentMode];
  const helpLink = currentMode === 'aqhi'
    ? `
      <a class="legend-help"
         href="info.html#aqhi"
         aria-label="What is this colour scale? Learn more on the Info page.">
         What’s this?
      </a>
    `
    : '<span></span>';

  const rows = cfg.legendRows.map(row => `
    <div class="legend-row">
      <span class="swatch" style="background:${row.color}"></span>
      <span class="legend-value">${row.label}</span>
      <span class="legend-band">${row.band}</span>
    </div>
  `).join('');

  legendContainer.classList.toggle('is-collapsed', legendCollapsed);
  legendContainer.innerHTML = `
    <div class="legend-title">
      <button type="button"
              class="legend-toggle"
              aria-expanded="${String(!legendCollapsed)}"
              aria-label="${legendCollapsed ? 'Expand legend' : 'Collapse legend'}">
        ${legendCollapsed ? '▸' : '▾'} ${cfg.label}
      </button>
      ${helpLink}
    </div>
    <div class="legend-body">
      <div class="legend-list" aria-label="${cfg.label} legend">
        ${rows}
      </div>
      ${cfg.note ? `<div class="legend-note">${cfg.note}</div>` : ''}
    </div>
  `;

  const btn = legendContainer.querySelector('.legend-toggle');
  btn.addEventListener('click', () => {
    legendCollapsed = !legendCollapsed;
    renderLegend();
  });
}

const legendControl = L.control({
  position: isDesktop ? 'topleft' : 'topright'
});

legendControl.onAdd = function () {
  legendContainer = L.DomUtil.create('div', 'aqhi-legend');
  L.DomEvent.disableClickPropagation(legendContainer);
  L.DomEvent.disableScrollPropagation(legendContainer);
  renderLegend();
  return legendContainer;
};

legendControl.addTo(map);

/* ── Data, markers, and layer switching ──────────────────────────── */

getSensorData().then(({ sensors, generated_at }) => {
  const layerGroups = {};
  const baseLayers = {};
  const layerToMode = new Map();

  Object.entries(LAYER_CONFIG).forEach(([mode, cfg]) => {
    const group = L.layerGroup();
    layerGroups[mode] = group;
    baseLayers[cfg.label] = group;
    layerToMode.set(group, mode);
  });

  sensors.forEach(sensor => {
    const { lat, lon, latest } = sensor;
    if (lat == null || lon == null) return;

    const popupHtml = `
      <b>${sensor.name ?? sensor.id}</b><br/>
      AQHI: ${latest?.aqhi ?? '—'}<br/>
      ${formatPrimaryPollutant(latest)}<br/>
      <small>${new Date(generated_at).toLocaleString()}</small>
    `;

    Object.entries(LAYER_CONFIG).forEach(([mode, cfg]) => {
      const value = cfg.getValue(latest);
      const color = cfg.getColor(value);

      const marker = L.circleMarker([lat, lon], {
        color,
        fillColor: color,
        fillOpacity: 0.85,
        radius: 8,
        weight: 1
      });

      marker.bindPopup(popupHtml);
      marker.addTo(layerGroups[mode]);
    });
  });

  layerGroups.aqhi.addTo(map);

  L.control.layers(baseLayers, null, {
    collapsed: false,
    position: 'topright'
  }).addTo(map);

  map.on('baselayerchange', e => {
    const mode = layerToMode.get(e.layer);
    if (!mode) return;
    currentMode = mode;
    renderLegend();
  });

  document.title += ` – updated ${new Date(generated_at).toLocaleTimeString()}`;
}).catch(err => {
  console.error(err);
  alert('Unable to load pollutant_data.json');
});