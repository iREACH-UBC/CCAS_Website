// js/details.js – full-day, hourly time axis with date labels at midnight
import { getSensorData } from './data.js';

// ------- Constants ---------------------------------------------------------

function bandColours () {
  return ['rgba(26,152,80,.12)', 'rgba(252,141,89,.12)', 'rgba(215,48,39,.12)'];
}

// Colour bands (PM10 deliberately omitted)
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

// Column indices that never change in your CSV layout
const FIXED = { CO: 3, NO: 4, NO2: 5, O3: 6, CO2: 7 };

// ---------------------------------------------------------------------------

const sensorSel    = document.getElementById('sensor-select');
const pollutantSel = document.getElementById('pollutant-select');
const ctx          = document.getElementById('pollutant-chart').getContext('2d');
let chart;

// Init once the list of sensors is known
init();
async function init () {
  const { sensors } = await getSensorData();
  sensors.forEach(s => sensorSel.add(new Option(s.name || s.id, s.id)));
  sensorSel.value    = sensors[0]?.id;
  pollutantSel.value = 'PM2.5';
  sensorSel.addEventListener('change', drawChart);
  pollutantSel.addEventListener('change', drawChart);
  await drawChart();
}

// ---------------------------------------------------------------------------

async function drawChart () {
  const { sensors } = await getSensorData();
  const sensor = sensors.find(x => x.id === sensorSel.value);
  if (!sensor) return alert('Sensor not found');

  // What column?
  const len = sensor.history[0].length;
  let idx   = pollutantSel.value === 'PM2.5' ? len - 1 : FIXED[pollutantSel.value];

  // Determine time window: latest timestamp → minus 24 h
  const latestIso = sensor.history[sensor.history.length - 1][0];
  const tMax      = Date.parse(latestIso);
  const tMin      = tMax - 24 * 60 * 60 * 1000;       // 24 h earlier

  // Build {x, y} pairs, *only* those within the last 24 hours
  const points = sensor.history
    .filter(row => {
      const t = Date.parse(row[0]);
      return t >= tMin && t <= tMax;
    })
    .map(row => {
      const val = +row[idx];
      return { x: row[0], y: isNaN(val) ? null : val };
    });

  const numeric = points.filter(p => p.y != null);
  if (!numeric.length) {
    ctx.canvas.parentNode.innerHTML =
      `<p style="padding:1rem;color:#c00">No data for ${pollutantSel.value} at ${sensor.name || sensor.id}</p>`;
    return;
  }

  chart?.destroy();     // clean up old plot

  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [{
      label: pollutantSel.value,
      data: points,
      borderColor: '#004b8d',
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: true,
      tension: 0.3
    }]},
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${pollutantSel.value} at ${sensor.name || sensor.id} (last 24 h)`,
          font: { size: 16 }
        },
        legend: { display: false }
        // Uncomment next line if you want the coloured bands back:
        // ,yBands: BANDS[pollutantSel.value]
      },
      scales: {
        x: {
          type: 'time',
          min: tMin,
          max: tMax,
          time: {
            unit: 'hour',
            stepSize: 1,
            displayFormats: { hour: 'HH' }   // base format
          },
          ticks: {
            autoSkip: false,                  // force 24 ticks
            callback (value, idx, ticks) {
              // Major ticks (00:00) → print date; others → print hour
              const tick = ticks[idx];
              const d = new Date(value);
              return tick.major
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
    }
    // plugins: [ yBandPlugin ]  // enable if desired
  });
}
