/* js/list.js – sortable list with expandable, tabulated pollutant info
   ------------------------------------------------------------------ */
import { getSensorData } from './data.js';

/* AQHI colour helper (matches map) */
function colourForAQHI(a){
  if (a <= 1)  return '#67c1f1';
  if (a <= 2)  return '#4e95c7';
  if (a <= 3)  return '#396798';
  if (a <= 4)  return '#e7eb38';
  if (a <= 5)  return '#f1cb2e';
  if (a <= 6)  return '#e79647';
  if (a <= 7)  return '#dd6869';
  if (a <= 8)  return '#d82732';
  if (a <= 9)  return '#bf2733';
  return '#8b2328';
}

/* quick helpers */
const fmt =(x,d=2)=> x==null ? '—' : Number(x).toFixed(d);
const aqhiBand = v => v==null ? '—' : v<=3 ? 'Low' : v<=6 ? 'Moderate' : v<=10 ? 'High' : 'Very High';

/* pollutant meta for tooltips & simple bands (very rough) */
const META = {
  co  : {name:'CO',  unit:'ppm', info:'Carbon monoxide can cause headaches and dizziness at high levels.',       low:4,  med:13},
  no  : {name:'NO',  unit:'ppb', info:'Nitric oxide – short-lived; precursor to NO₂ and ozone.',                 low:53, med:106},
  no2 : {name:'NO₂', unit:'ppb', info:'Nitrogen dioxide irritates lungs; contributes to smog.',                  low:53, med:106},
  o3  : {name:'O₃',  unit:'ppb', info:'Ozone can irritate the respiratory system.',                              low:33, med:66},
  co2 : {name:'CO₂', unit:'ppm', info:'Carbon dioxide – indoor air-quality proxy.',                              low:800,med:1200},
  pm25: {name:'PM₂.₅',unit:'µg/m³',info:'Fine particles penetrate deep into lungs.',                            low:12, med:25}
};

/* table & sort setup */
const tbody   = document.querySelector('#sensor-table tbody');
const headers = document.querySelectorAll('#sensor-table th');

let sensors = [],
    sortKey = 'id',
    sortDir = 1;         // 1 = ascending, -1 = descending

/* helper for sort keys */
function keyVal(s,key){
  switch (key){
    case 'id'        : return s.id ?? '';
    case 'name'      : return s.name ?? '';
    case 'aqhi'      : return s.latest?.aqhi ?? -Infinity;
    case 'primary'   : return s.latest?.primary ?? '';
    case 'timestamp' : {
      const t = s.latest?.timestamp;
      return t ? Date.parse(t) : 0;        // numeric for correct ordering
    }
    default          : return '';
  }
}

/* build one sensor row + hidden details */
function buildRows(s){
  const { id, name } = s;
  const { aqhi, primary, pollutants = {}, timestamp } = s.latest ?? {};

  /* HH:MM (24-h) string or em-dash */
  const timeHHMM = timestamp
    ? new Date(timestamp).toLocaleTimeString(undefined, {
        hour:'2-digit', minute:'2-digit', hour12:false })
    : '—';

  /* summary row */
  const row = document.createElement('tr');
  row.className = 'sensor-row';
  row.innerHTML = `
    <td>${id}</td>
    <td>${name ?? '—'}</td>
    <td style="background:${colourForAQHI(aqhi)};color:#fff;text-align:center;">${aqhi ?? '—'}</td>
    <td>${primary ?? '—'}</td>
    <td>${timeHHMM}</td>`;

  /* detail row */
  const detail = document.createElement('tr');
  detail.className = 'sensor-detail';
  detail.style.display = 'none';
  detail.innerHTML = `<td colspan="5" class="detail-cell">
    <strong>AQHI:</strong> ${aqhi ?? '—'} (${aqhiBand(aqhi)} risk)<br>
    <strong>Main Contributor:</strong> ${primary ?? '—'}
    <table class="poll-table">
      <thead><tr><th>Pollutant</th><th>Conc.</th><th>Status</th></tr></thead>
      <tbody>
        ${Object.entries(META).map(([k,{name,unit,info,low,med}])=>{
          const val = pollutants[k];
          const status = val==null ? '—' : val<=low ? 'Low' : val<=med ? 'Moderate' : 'High';
          return `<tr>
            <td title="${info}">${name}</td>
            <td>${fmt(val, k==='pm25' ? 1 : 2)} ${unit}</td>
            <td>${status}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </td>`;

  /* click ↔ toggle */
  row.addEventListener('click',()=>{
    detail.style.display = detail.style.display==='none' ? 'table-row' : 'none';
  });

  return [row, detail];
}

/* render full table */
function render(){
  tbody.innerHTML = '';
  [...sensors]
    .sort
