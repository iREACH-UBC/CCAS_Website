// js/list.js – sortable sensor list with expandable details
// ---------------------------------------------------------
import { getSensorData } from './data.js';

/* ---------- colour helper (same scheme as map.js) ---------- */
function colourForAQHI(a) {
  if (a <= 1) return '#67c1f1';
  if (a <= 2) return '#4e95c7';
  if (a <= 3) return '#396798';
  if (a <= 4) return '#e7eb38';
  if (a <= 5) return '#f1cb2e';
  if (a <= 6) return '#e79647';
  if (a <= 7) return '#dd6869';
  if (a <= 8) return '#d82732';
  if (a <= 9) return '#bf2733';
  return '#8b2328';
}

/* ---------- AQHI band descriptor ---------------------------------------- */
function aqhiBand(val) {
  if (val == null) return '—';
  if (val <= 3) return 'Low';
  if (val <= 6) return 'Moderate';
  if (val <= 10) return 'High';
  return 'Very High';
}

function fmt(x, decimals = 2) {
  return x == null ? '—' : Number(x).toFixed(decimals);
}

/* ---------- DOM nodes ---------------------------------------------------- */
const tbody   = document.querySelector('#sensor-table tbody');
const headers = document.querySelectorAll('#sensor-table th');

let sensors = [];                // fetched list
let sortKey = 'id';
let sortDir = 1;                 // 1 = asc, -1 = desc

/* ---------- table renderer ---------------------------------------------- */
function render() {
  tbody.innerHTML = '';

  const sorted = [...sensors].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    return av > bv ? sortDir : av < bv ? -sortDir : 0;
  });

  sorted.forEach(sensor => {
    const { id, name } = sensor;
    const { aqhi, primary, pollutants = {}, timestamp } = sensor.latest ?? {};

    /* summary row */
    const tr = document.createElement('tr');
    tr.className = 'sensor-row';
    tr.innerHTML = `
      <td>${id}</td>
      <td>${name ?? '—'}</td>
      <td style="background:${colourForAQHI(aqhi)};color:#fff;text-align:center;">${aqhi ?? '—'}</td>
      <td>${primary ?? '—'}</td>
      <td>${timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}</td>`;

    /* detail row */
    const detail = document.createElement('tr');
    detail.className = 'sensor-detail';
    detail.style.display = 'none';
    detail.innerHTML = `<td colspan="5">
        <strong>AQHI:</strong> ${aqhi ?? '—'} (${aqhiBand(aqhi)} risk)<br>
        <strong>Primary pollutant:</strong> ${primary ?? '—'}<br>
        <strong>Concentrations:</strong>
          CO ${fmt(pollutants.co)} ppm,
          NO ${fmt(pollutants.no)} ppb,
          NO₂ ${fmt(pollutants.no2)} ppb,
          O₃ ${fmt(pollutants.o3)} ppb,
          CO₂ ${fmt(pollutants.co2)} ppm,
          PM₂.₅ ${fmt(pollutants.pm25,1)} µg/m³
      </td>`;

    /* toggle on click */
    tr.addEventListener('click', () => {
      detail.style.display = detail.style.display === 'none' ? 'table-row' : 'none';
    });

    tbody.appendChild(tr);
    tbody.appendChild(detail);
  });
}

/* ---------- header click = toggle sort ---------------------------------- */
headers.forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    sortDir = key === sortKey ? -sortDir : 1;
    sortKey = key;

    // update small arrow indicator
    headers.forEach(h => h.textContent = h.textContent.replace(/ ▲| ▼/, ''));
    th.textContent += sortDir === 1 ? ' ▲' : ' ▼';

    render();
  });
});

/* ---------- initial fetch ----------------------------------------------- */
getSensorData()
  .then(({ sensors: list }) => {
    sensors = list.filter(s => s.latest && s.latest.aqhi != null);
    render();

    // jump to row if URL hash present
    if (location.hash) {
      const id = location.hash.slice(1);
      const row = [...tbody.querySelectorAll('.sensor-row')]
        .find(r => r.cells[0].textContent === id);
      row?.scrollIntoView({ block: 'center' });
      row?.classList.add('highlight');
    }
  })
  .catch(err => {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5">Failed to load data.</td></tr>';
  });
