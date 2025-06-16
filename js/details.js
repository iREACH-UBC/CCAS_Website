// js/details.js – Simplified category-axis chart with axis labels and units

import { getSensorData } from './data.js';

// Colour bands (we’ll re-add these after confirming the line plots)
const BANDS = {
  'PM2.5': { limits:[0,12,25,100],   colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  PM10:    { limits:[0,50,100,300],  colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  O3:      { limits:[0,33,66,200],   colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  NO2:     { limits:[0,53,106,400],  colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  NO:      { limits:[0,53,106,400],  colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  CO:      { limits:[0,4,13,50],     colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] },
  CO2:     { limits:[350,800,1200,2000], colors:['rgba(26,152,80,.12)','rgba(252,141,89,.12)','rgba(215,48,39,.12)'] }
};

// Units for axis labels
const UNITS = {
  'PM2.5': 'μg/m³',
  'PM10': 'μg/m³',
  'O3': 'ppb',
  'NO2': 'ppb',
  'NO': 'ppb',
  'CO': 'ppm',
  'CO2': 'ppm'
};

// Background-band plugin (won’t hurt once we re-add)
const yBandPlugin = {
  id:'yBands',
  beforeDatasetsDraw(chart, _args, {limits, colors}) {
    if (!limits) return;
    const {ctx, chartArea, scales:{y}} = chart;
    ctx.save();
    colors.forEach((c,i) => {
      const yTop = y.getPixelForValue(limits[i+1]);
      const yBot = y.getPixelForValue(limits[i]);
      ctx.fillStyle = c;
      ctx.fillRect(chartArea.left, yTop, chartArea.width, yBot - yTop);
    });
    ctx.restore();
  }
};

const sensorSel    = document.getElementById('sensor-select');
const pollutantSel = document.getElementById('pollutant-select');
const canvas       = document.getElementById('pollutant-chart');
const ctx          = canvas.getContext('2d');
let chart;

// Simple map of fixed columns
const FIXED = { CO:3, NO:4, NO2:5, O3:6, CO2:7 };

// Load sensors & init
getSensorData().then(({ sensors }) => {
  sensors.forEach(s => sensorSel.add(new Option(s.name||s.id, s.id)));
  sensorSel.value    = sensors[0]?.id;
  pollutantSel.value = 'PM2.5';
  drawChart();
});

sensorSel.addEventListener('change', drawChart);
pollutantSel.addEventListener('change', drawChart);

async function drawChart() {
  const { sensors } = await getSensorData();
  const s = sensors.find(x => x.id === sensorSel.value);
  if (!s) return alert('Sensor not found');

  // Determine index for the chosen pollutant
  const len = s.history[0].length;
  let idx = FIXED[pollutantSel.value];
  if (pollutantSel.value === 'PM2.5') idx = len - 1;
  if (pollutantSel.value === 'PM10')  idx = len >= 10 ? len - 1 : null;
  if (idx == null) return alert(`${pollutantSel.value} unavailable`);

  // Build label & value arrays
  const labels  = s.history.map(r => r[0]);
  const values  = s.history.map(r => {
    const v = r[idx];
    return (v == null || isNaN(v)) ? null : +v;
  });
  const numeric = values.filter(v => v != null);

  // Destroy old chart
  if (chart) chart.destroy();

  // No data?
  if (!numeric.length) {
    canvas.parentNode.innerHTML = `<p style=\"padding:1rem;color:#c00\">` +
      `No data for ${pollutantSel.value} at ${s.name||s.id}` +
      `</p>`;
    return;
  }

  // Determine y-axis max
  const maxVal = Math.max(...numeric);
  const suggestedMax = maxVal * 1.1;

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: pollutantSel.value,
        data: values,
        borderColor: '#004b8d',
        borderWidth: 2,
        pointRadius: 0,
        spanGaps: true,
        tension: .3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `${pollutantSel.value} at ${s.name||s.id} (last 24 h)`,
          font: { size: 16 }
        },
        legend: { display: false }
        // yBands plugin can be re-added by uncommenting below:
        //   yBands: { limits: BANDS[pollutantSel.value].limits, colors: BANDS[pollutantSel.value].colors }
      },
      scales: {
        x: {
          display: true,
          title: { display: true, text: 'Time' },
          ticks: {
            maxTicksLimit: 12,
            callback: function(_t, i) {
              const iso = labels[i];
              const d   = new Date(iso);
              if (d.getHours() === 0 && d.getMinutes() === 0) {
                return d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
              }
              return String(d.getHours()).padStart(2, '0');
            }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax,
          title: { display: true, text: `${pollutantSel.value} (${UNITS[pollutantSel.value]})` }
        }
      }
    }
    // plugins: [ yBandPlugin ]  ← re-enable band drawing here
  });
}
