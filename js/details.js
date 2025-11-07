// js/details.js – fixed 24-h window, date label at midnight, cross-hair tracker
// + remembers last sensor / pollutant across reloads
import { getSensorData } from './data.js';

/* ---------- Constants ---------------------------------------------------- */

function bandColours () {
  return ['rgba(26,152,80,.12)',
          'rgba(252,141,89,.12)',
          'rgba(215,48,39,.12)'];
}

const BANDS = {
  'PM2.5': { limits: [0, 12, 25, 100],   colors: bandColours() },
  O3:      { limits: [0, 33, 66, 200],   colors: bandColours() },
  NO2:     { limits: [0, 53, 106, 400],  colors: bandColours() },
  NO:      { limits: [0, 53, 106, 400],  colors: bandColours() },
  CO:      { limits: [0, 4, 13, 50],     colors: bandColours() },
  CO2:     { limits: [350, 800, 1200, 2000], colors: bandColours() }
};

const UNITS = {
  'PM2.5': 'μg/m³', O3: 'ppb', NO2: 'ppb', NO: 'ppb', CO: 'ppm', CO2: 'ppm'
};

// CSV column indices that never move
const FIXED = { CO: 3, NO: 4, NO2: 5, O3: 6, CO2: 7 };

/* ---------- Persistence helpers ----------------------------------------- */

const STORAGE_KEY = 'ccas.detailedView';

function saveState (sensor, pollutant) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sensor, pollutant }));
  const qs = new URLSearchParams({ sensor, pollutant });
  history.replaceState({}, '', `${location.pathname}?${qs.toString()}`);
}

function loadState (sensors) {
  // 1️⃣ Try URL parameters first
  const params          = new URLSearchParams(location.search);
  let sensor     = params.get('sensor');
  let pollutant  = params.get('pollutant');

  // 2️⃣ Fall back to localStorage
  if (!sensor || !pollutant) {
    try {
      ({ sensor, pollutant } = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {});
    } catch (_) { /* ignore */ }
  }

  // 3️⃣ Validate
  const validSensor     = sensors.find(s => s.id === sensor)?.id ?? sensors[0]?.id;
  const validPollutants = ['PM2.5', ...Object.keys(UNITS)];
  const validPollutant  = validPollutants.includes(pollutant) ? pollutant : 'PM2.5';

  return { sensor: validSensor, pollutant: validPollutant };
}

/* ---------- DOM ---------------------------------------------------------- */

const sensorSel    = document.getElementById('sensor-select');
const pollutantSel = document.getElementById('pollutant-select');
const ctx          = document.getElementById('pollutant-chart').getContext('2d');

let chart;

/* ---------- Initialise --------------------------------------------------- */

init();
async function init () {
  const { sensors }   = await getSensorData();
  sensors.forEach(s => sensorSel.add(new Option(s.name || s.id, s.id)));

  const state         = loadState(sensors);
  sensorSel.value     = state.sensor;
  pollutantSel.value  = state.pollutant;

  sensorSel.addEventListener('change', () => {
    saveState(sensorSel.value, pollutantSel.value);
    drawChart();
  });
  pollutantSel.addEventListener('change', () => {
    saveState(sensorSel.value, pollutantSel.value);
    drawChart();
  });

  await drawChart();                    // first render
}

/* ---------- Chart-drawing ------------------------------------------------ */

async function drawChart () {
  const { sensors } = await getSensorData();
  const sensor = sensors.find(x => x.id === sensorSel.value);
  if (!sensor) return alert('Sensor not found');

  /* ----- Choose column --------------------------------------------------- */
  const len = sensor.history[0].length;
  const idx = pollutantSel.value === 'PM2.5'
    ? len - 1
    : FIXED[pollutantSel.value];

  /* ----- Define exact 24-h window --------------------------------------- */
  const lastDt = new Date(sensor.history.at(-1)[0]);
  if (lastDt.getMinutes() || lastDt.getSeconds() || lastDt.getMilliseconds()) {
    lastDt.setHours(lastDt.getHours() + 1, 0, 0, 0);
  }
  const tMax = +lastDt;
  const tMin = tMax - 24 * 60 * 60 * 1000;

  /* ----- Build dataset --------------------------------------------------- */
  const points = sensor.history
    .filter(row => {
      const t = Date.parse(row[0]);
      return t >= tMin && t <= tMax;
    })
    .map(row => {
      const raw = row[idx];
      const str = raw == null ? '' : String(raw).trim();
      const parsed = parseFloat(str);
      const y = (!str || !Number.isFinite(parsed)) ? null : parsed;  // '', null, 'NA', 'NaN', 'null' → gap
      return { x: row[0], y };
    });


  const numeric = points.filter(p => p.y != null);
  if (!numeric.length) {
    ctx.canvas.parentNode.innerHTML =
      `<p style="padding:1rem;color:#c00">No data for ${pollutantSel.value} at ${sensor.name || sensor.id}</p>`;
    return;
  }

  // Update footer with last-seen timestamp for this sensor
  document.getElementById('stamp').textContent =
    'Last seen ' + new Date(sensor.history.at(-1)[0]).toLocaleString();

  /* ----- (Re)draw -------------------------------------------------------- */
  chart?.destroy();

  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [{
      label: pollutantSel.value,
      data: points,
      borderColor: '#004b8d',
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: false,
      tension: 0.3
    }]},
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: `${pollutantSel.value} at ${sensor.name || sensor.id} (last 24 h)`,
          font: { size: 16 }
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${ctx.parsed.y ?? '—'} ${UNITS[pollutantSel.value]}`
          }
        }
        // ,yBands: BANDS[pollutantSel.value]   // uncomment to re-enable AQHI bands
      },
      scales: {
        x: {
          type: 'time',
          min: tMin,
          max: tMax,
          time: {
            unit: 'hour',
            stepSize: 1,
            displayFormats: { hour: 'HH' }
          },
          ticks: {
            autoSkip: false,
            callback (value) {
              const d = new Date(value);
              return d.getHours() === 0
                ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : String(d.getHours()).padStart(2, '0');
            }
          },
          title: { display: true, text: 'Time (local)' }
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...numeric.map(p => p.y)) * 1.1,
          title: { display: true, text: `${pollutantSel.value} (${UNITS[pollutantSel.value]})` }
        }
      }
    },
    plugins: [crosshairPlugin]
  });
}

/* ---------- Cross-hair plugin ------------------------------------------- */
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw (chart) {
    const { ctx, tooltip, chartArea: { top, bottom } } = chart;
    if (!tooltip || tooltip.opacity === 0 || !tooltip._active?.length) return;

    const x = tooltip._active[0].element.x;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  }
};
