// js/details.js – time-scale chart, PM10 removed
import { getSensorData } from './data.js';

// Colour bands (PM10 removed)
const BANDS = {
  'PM2.5': { limits: [0, 12, 25, 100],   colors: bandColours() },
  O3:      { limits: [0, 33, 66, 200],   colors: bandColours() },
  NO2:     { limits: [0, 53, 106, 400],  colors: bandColours() },
  NO:      { limits: [0, 53, 106, 400],  colors: bandColours() },
  CO:      { limits: [0, 4, 13, 50],     colors: bandColours() },
  CO2:     { limits: [350, 800, 1200, 2000], colors: bandColours() }
};
function bandColours () {
  return ['rgba(26,152,80,.12)', 'rgba(252,141,89,.12)', 'rgba(215,48,39,.12)'];
}

const UNITS = {
  'PM2.5': 'μg/m³', O3: 'ppb', NO2: 'ppb', NO: 'ppb', CO: 'ppm', CO2: 'ppm'
};

// Y-axis background-band plugin (still optional)
const yBandPlugin = {
  id: 'yBands',
  beforeDatasetsDraw (chart, _args, { limits, colors }) {
    if (!limits) return;
    const { ctx, chartArea, scales: { y } } = chart;
    ctx.save();
    colors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(
        chartArea.left,
        y.getPixelForValue(limits[i + 1]),
        chartArea.width,
        y.getPixelForValue(limits[i]) - y.getPixelForValue(limits[i + 1])
      );
    });
    ctx.restore();
  }
};

const sensorSel    = document.getElementById('sensor-select');
const pollutantSel = document.getElementById('pollutant-select');
const ctx          = document.getElementById('pollutant-chart').getContext('2d');

let chart;
// Column indices that never change in your CSV layout
const FIXED = { CO: 3, NO: 4, NO2: 5, O3: 6, CO2: 7 };

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

async function drawChart () {
  const { sensors } = await getSensorData();
  const sensor = sensors.find(x => x.id === sensorSel.value);
  if (!sensor) return alert('Sensor not found');

  // Which column?
  const len = sensor.history[0].length; // total columns in a row
  let idx = pollutantSel.value === 'PM2.5' ? len - 1 : FIXED[pollutantSel.value];

  // Build dataset ••• use {x, y} objects so we can switch to a time scale
  const dataPts = sensor.history.map(row => {
    const v = +row[idx];
    return { x: row[0], y: isNaN(v) ? null : v };
  });

  const numeric = dataPts.filter(pt => pt.y != null);
  if (!numeric.length) {
    ctx.canvas.parentNode.innerHTML =
      `<p style="padding:1rem;color:#c00">No data for ${pollutantSel.value} at ${sensor.name || sensor.id}</p>`;
    return;
  }

  chart?.destroy(); // clean up old plot

  chart = new Chart(ctx, {
    type: 'line',
    data: { datasets: [{
      label: pollutantSel.value,
      data: dataPts,
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
        // To turn the background bands back on, uncomment:
        // ,yBands: BANDS[pollutantSel.value]
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
            displayFormats: { hour: 'HH' }
          },
          title: { display: true, text: 'Time (local)' }
        },
        y: {
          beginAtZero: true,
          suggestedMax: Math.max(...numeric.map(pt => pt.y)) * 1.1,
          title: { display: true, text: `${pollutantSel.value} (${UNITS[pollutantSel.value]})` }
        }
      }
    },
    // plugins: [ yBandPlugin ] // re-enable if you want the coloured bands
  });
}
