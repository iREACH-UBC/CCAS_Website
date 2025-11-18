// js/details.js – fixed 24-h window, date label at midnight, cross-hair tracker
// + remembers last sensor / pollutant across reloads
import { getSensorData } from './data.js';


// Chart defaults
Chart.defaults.font.family = 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
Chart.defaults.color = '#0b1f33';
Chart.defaults.elements.line.borderCapStyle = 'round';
Chart.defaults.elements.line.borderJoinStyle = 'round';
Chart.defaults.elements.point.hitRadius = 12;

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
  CO2:     { limits: [0, 800, 1200, 2000], colors: bandColours() }
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
const warningEl    = document.getElementById('sensor-warning');

let chart;

/* ---------- Stale sensor warning ----------------------------------------- */

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

function updateStaleWarning(lastSampleDate, sensor) {
  if (!warningEl) return;

  let show = false;
  let extraLine = '';

  if (!(lastSampleDate instanceof Date) || isNaN(lastSampleDate)) {
    // No valid data at all
    show = true;
    extraLine = 'There is no recent data available for this sensor.';
  } else {
    const ageMs = Date.now() - lastSampleDate.getTime();
    show = ageMs > STALE_THRESHOLD_MS;
    extraLine = `The most recent data point was recorded at ${lastSampleDate.toLocaleString()}.`;
  }

  if (show) {
    warningEl.hidden = false;
    warningEl.innerHTML = `
      <div class="sensor-offline-warning__icon" aria-hidden="true">⚠️</div>
      <div class="sensor-offline-warning__text">
        <strong>This sensor may be offline.</strong><br>
        There is no data in the last two hours for
        <span class="sensor-offline-warning__sensor">${sensor.name || sensor.id}</span>.<br>
        ${extraLine}<br>
        Learn how power cycling can affect sensor data accuracy in
        <a href="power-cycling-and-data-accuracy.html">
          this guide
        </a>.
      </div>
    `;
  } else {
    warningEl.hidden = true;
    warningEl.innerHTML = '';
  }
}


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
  const lastRaw = new Date(sensor.history.at(-1)[0]);  // actual last sample time
  const lastDt  = new Date(lastRaw);                   // axis end (may be rounded)

  // Round axis end up to the next hour if needed (for nicer x-axis)
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
  const lastValidTime = numeric.length
    ? new Date(numeric[numeric.length - 1].x)
    : null;

  // 🔔 Update stale sensor warning using the *last valid data point*
  updateStaleWarning(lastValidTime, sensor);

  // Update footer with last *file* timestamp (unchanged behaviour)
  document.getElementById('stamp').textContent =
    'Last seen ' + lastRaw.toLocaleString();

  /* ----- Compute no-data ranges for shading ----------------------------- */
  const noDataRanges = [];
  let currentGapStartMs = null;

  // Gaps where y === null
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const tMs = Date.parse(p.x);
    if (p.y == null) {
      if (currentGapStartMs === null) currentGapStartMs = tMs;
    } else if (currentGapStartMs !== null) {
      noDataRanges.push([currentGapStartMs, tMs]);
      currentGapStartMs = null;
    }
  }
  // If we ended inside a gap, extend to tMax
  if (currentGapStartMs !== null) {
    noDataRanges.push([currentGapStartMs, tMax]);
  }

  // If there is *no* numeric data at all, shade the whole window
  if (!numeric.length) {
    noDataRanges.length = 0;
    noDataRanges.push([tMin, tMax]);
  }

  // If the sensor is stale but we have at least one valid point, also
  // gray out from the last valid point to the end of the window
  if (lastValidTime) {
    const ageMs = Date.now() - lastValidTime.getTime();
    if (ageMs > STALE_THRESHOLD_MS && lastValidTime.getTime() < tMax) {
      noDataRanges.push([lastValidTime.getTime(), tMax]);
    }
  }

  /* ----- (Re)draw -------------------------------------------------------- */
  chart?.destroy();

  // --- Beautify: gradient fill, gap-end dots, lighter grids, smarter tooltips ---
  const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  grad.addColorStop(0, 'rgba(0,75,141,0.22)');
  grad.addColorStop(1, 'rgba(0,75,141,0)');

  // Mark the ends of gaps with small dots
  const gapEnds = new Set();
  for (let i = 0; i < points.length; i++) {
    const cur = points[i]?.y, next = points[i+1]?.y, prev = points[i-1]?.y;
    if (cur != null && (next == null || prev == null)) gapEnds.add(i);
  }

  // Safe max for y-axis
  const maxY = numeric.length ? Math.max(...numeric.map(p => p.y)) : 1;

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [{
        label: pollutantSel.value,
        data: points,
        borderColor: '#004b8d',
        backgroundColor: grad,
        fill: true, //controls the underline gradient
        borderWidth: 2,
        pointRadius: (ctx) => gapEnds.has(ctx.dataIndex) ? 2.5 : 0,
        pointHoverRadius: 4,
        spanGaps: false,
        tension: 0.28
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 450, easing: 'easeOutQuart' },
      layout: { padding: { top: 18 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: `${pollutantSel.value} at ${sensor.name || sensor.id} (last 24 h)`,
          font: { size: 16 }
        },
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items) => {
              const t = items[0]?.parsed?.x;
              return t ? new Date(t).toLocaleString() : '';
            },
            label: (ctx) => {
              const y = ctx.parsed.y;
              const unit = UNITS[pollutantSel.value] || '';
              if (y == null || !Number.isFinite(y)) return 'No data';
              const digits = Math.abs(y) < 10 ? 2 : 1;
              return `${ctx.dataset.label}: ${y.toLocaleString(undefined,{maximumFractionDigits:digits})} ${unit}`;
            }
          }
        },
        // Built-in decimation keeps it smooth with lots of points
        decimation: { enabled: true, algorithm: 'lttb', samples: 300 },

        // NEW: ranges for the no-data shading plugin
        noDataGaps: {
          ranges: noDataRanges
        }
      },
      scales: {
        x: {
          type: 'time',
          min: tMin,
          max: tMax,
          time: { unit: 'hour', stepSize: 1, displayFormats: { hour: 'HH' } },
          grid: { color: 'rgba(0,0,0,.06)' },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
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
          suggestedMax: maxY * 1.1,
          grid: { color: 'rgba(0,0,0,.06)' },
          ticks: {
            callback: (v) => {
              // Round sensibly for readability
              const digits = Math.abs(v) < 10 ? 1 : 0;
              return Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
            }
          },
          title: { display: true, text: `${pollutantSel.value} (${UNITS[pollutantSel.value]})` }
        }
      }
    },
    // NEW: include the gap-shading plugin
    plugins: [crosshairPlugin, dayDividersPlugin, noDataGapsPlugin]
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

// Background concentration bands (uses your BANDS table)
const yBandsPlugin = {
  id: 'yBands',
  beforeDatasetsDraw(chart) {
    const bands = BANDS[pollutantSel.value];
    if (!bands) return;
    const { ctx, chartArea: { left, right, top, bottom }, scales: { y } } = chart;
    const [a, b, c, d] = bands.limits;
    const ranges = [[a,b],[b,c],[c,d]];
    ctx.save();
    ranges.forEach(([lo, hi], i) => {
      const yTop = y.getPixelForValue(hi);
      const yBot = y.getPixelForValue(lo);
      const hTop = Math.max(top, Math.min(yTop, bottom));
      const hBot = Math.max(top, Math.min(yBot, bottom));
      ctx.fillStyle = bands.colors[i];
      ctx.fillRect(left, Math.min(hTop, hBot), right - left, Math.abs(hBot - hTop));
    });
    ctx.restore();
  }
};

// Draw a vertical line at each midnight boundary, with a date label at the top
const dayDividersPlugin = {
  id: 'dayDividers',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
    if (!x || !Number.isFinite(x.min) || !Number.isFinite(x.max)) return;

    // style
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.65)';

    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

    // first midnight strictly after the left edge
    const first = new Date(x.min);
    first.setHours(0, 0, 0, 0);
    if (first.getTime() <= x.min) first.setDate(first.getDate() + 1);

    for (let d = new Date(first); d.getTime() <= x.max; d.setDate(d.getDate() + 1)) {
      const px = x.getPixelForValue(d);
      // line
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      // label at the top, inside the chart area
      ctx.fillText(fmt.format(d), px + 2, bottom - 10);
    }
    ctx.restore();
  }
};

// Shade periods with no data for the selected pollutant
const noDataGapsPlugin = {
  id: 'noDataGaps',
  beforeDatasetsDraw(chart, args, opts) {
    const ranges = opts?.ranges;
    if (!ranges || !ranges.length) return;

    const { ctx, chartArea: { top, bottom, left, right }, scales: { x } } = chart;
    if (!x) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.04)'; // light gray veil

    for (const [startMs, endMs] of ranges) {
      const xStart = x.getPixelForValue(startMs);
      const xEnd   = x.getPixelForValue(endMs);
      const leftPx  = Math.max(left, Math.min(xStart, xEnd));
      const rightPx = Math.min(right, Math.max(xStart, xEnd));
      if (rightPx <= leftPx) continue;
      ctx.fillRect(leftPx, top, rightPx - leftPx, bottom - top);
    }

    ctx.restore();
  }
};

