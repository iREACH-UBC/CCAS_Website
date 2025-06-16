/* js/list.js  – builds and sorts the sensor list */
import { getSensorData } from './data.js';

/* ---------- colour helper (same scheme as map.js) ------------------------- */
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

/* ---------- DOM helpers --------------------------------------------------- */
const tbody = document.querySelector('#sensor-table tbody');
const headers = document.querySelectorAll('#sensor-table th');

let sensors = [];
let sortKey = 'id';
let sortDir = 1;          // 1 = asc, -1 = desc

function render() {
  tbody.innerHTML = '';
  const sorted = [...sensors].sort((a, b) => {
    const av = a[sortKey] ?? '';
    const bv = b[sortKey] ?? '';
    return av > bv ? sortDir : av < bv ? -sortDir : 0;
  });

  sorted.forEach(s => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${s.id}</td>
      <td>${s.name ?? '—'}</td>
      <td style="background:${colourForAQHI(s.latest.aqhi)};color:#fff;text-align:center;">
        ${s.latest.aqhi}
      </td>
      <td>${s.latest.primary ?? '—'}</td>
      <td>${new Date(s.latest.timestamp).toLocaleTimeString()}</td>`;
    row.onclick = () => location.href = `map.html#${s.id}`;
    tbody.appendChild(row);
  });
}

/* ---------- header click = toggle sort ------------------------------------ */
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

/* ---------- initial fetch ------------------------------------------------- */
getSensorData().then(({ sensors: list }) => {
  sensors = list.filter(s => s.latest && s.latest.aqhi != null);
  render();

  // jump to row if hash present
  if (location.hash) {
    const id = location.hash.slice(1);
    const row = [...tbody.rows].find(r => r.cells[0].textContent === id);
    row?.scrollIntoView({ block: 'center' });
    row?.classList.add('highlight');
  }
}).catch(err => {
  console.error(err);
  tbody.innerHTML = '<tr><td colspan="5">Failed to load data.</td></tr>';
});
