/* js/list.js – sortable sensor list with expandable details
---------------------------------------------------------------- */
import { getSensorData } from './data.js';

/* --- AQHI colour helper (matches map) ------------------------ */
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

/* --- helpers ------------------------------------------------- */
const aqhiBand = v =>
  v == null ? '—' : v <= 3 ? 'Low' : v <= 6 ? 'Moderate' : v <= 10 ? 'High' : 'Very High';
const fmt = (x, d = 2) => (x == null ? '—' : Number(x).toFixed(d));

/* --- DOM refs ------------------------------------------------ */
const tbody   = document.querySelector('#sensor-table tbody');
const headers = document.querySelectorAll('#sensor-table th');

let sensors = [];
let sortKey = 'id';
let sortDir = 1;          // 1 asc, -1 desc

/* value extractor for each sortable column */
function valueByKey(sensor, key) {
  switch (key) {
    case 'id':        return sensor.id ?? '';
    case 'name':      return sensor.name ?? '';
    case 'aqhi':      return sensor.latest?.aqhi ?? -Infinity;      // nulls last
    case 'primary':   return sensor.latest?.primary ?? '';
    case 'timestamp': return sensor.latest?.timestamp ?? 0;
    default:          return '';
  }
}

/* --- render table ------------------------------------------- */
function render() {
  tbody.innerHTML = '';

  const sorted = [...sensors].sort((a, b) => {
    const av = valueByKey(a, sortKey);
    const bv = valueByKey(b, sortKey);
    return av > bv ? sortDir : av < bv ? -sortDir : 0;
  });

  sorted.forEach(s => {
    const { id, name } = s;
    const { aqhi, primary, pollutants = {}, timestamp } = s.latest ?? {};

    /* summary row */
    const row = document.createElement('tr');
    row.className = 'sensor-row';
    row.innerHTML = `
      <td>${id}</td>
      <td>${name ?? '—'}</td>
      <td style="background:${colourForAQHI(aqhi)};color:#fff;text-align:center;">
        ${aqhi ?? '—'}
      </td>
      <td>${primary ?? '—'}</td>
      <td>${timestamp ? new Date(timestamp).toLocaleTimeString() : '—'}</td>`;

    /* detail row */
    const detail = document.createElement('tr');
    detail.className = 'sensor-detail';
    detail.style.display = 'none';
    detail.innerHTML = `<td colspan="5" class="detail-cell">
        <strong>AQHI:</strong> ${aqhi ?? '—'} (${aqhiBand(aqhi)} risk)<br>
        <strong>Main Contributor:</strong> ${primary ?? '—'}<br>
        <strong>Concentrations:</strong>
          CO ${fmt(pollutants.co)} ppm,
          NO ${fmt(pollutants.no)} ppb,
          NO₂ ${fmt(pollutants.no2)} ppb,
          O₃ ${fmt(pollutants.o3)} ppb,
          CO₂ ${fmt(pollutants.co2)} ppm,
          PM₂.₅ ${fmt(pollutants.pm25,1)} µg/m³
      </td>`;

    row.addEventListener('click', () => {
      detail.style.display =
        detail.style.display === 'none' ? 'table-row' : 'none';
    });

    tbody.appendChild(row);
    tbody.appendChild(detail);
  });
}

/* --- header clicks to sort ---------------------------------- */
headers.forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.key;
    sortDir = key === sortKey ? -sortDir : 1;
    sortKey = key;

    headers.forEach(h => (h.textContent = h.textContent.replace(/ ▲| ▼/, '')));
    th.textContent += sortDir === 1 ? ' ▲' : ' ▼';

    render();
  });
});

/* --- initial fetch ------------------------------------------ */
getSensorData()
  .then(({ sensors: list }) => {
    sensors = list.filter(s => s.latest && s.latest.aqhi != null);
    render();
  })
  .catch(err => {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="5">⚠ Failed to load sensor data.</td></tr>';
  });
