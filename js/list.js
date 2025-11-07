/* js/list.js – table on desktop, cards on mobile */
import { getSensorData } from './data.js';

/* ---------- helpers ------------------------------------------------- */
function colourForAQHI(a){
  if (a == null) return '#888';
  if (a<=1)  return '#67c1f1';
  if (a<=2)  return '#4e95c7';
  if (a<=3)  return '#396798';
  if (a<=4)  return '#e7eb38';
  if (a<=5)  return '#f1cb2e';
  if (a<=6)  return '#e79647';
  if (a<=7)  return '#dd6869';
  if (a<=8)  return '#d82732';
  if (a<=9)  return '#bf2733';
  return '#8b2328';
}
const fmt      =(x,d=2)=> x==null ? '—' : Number(x).toFixed(d);
const aqhiBand = v=> v==null ? '—' : v<=3 ? 'Low' : v<=6 ? 'Moderate' : v<=10? 'High' : 'Very High';
const fmtTS = (ts, withDate) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return withDate
    ? d.toLocaleString(undefined,{ year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
    : d.toLocaleTimeString(undefined,{ hour:'2-digit', minute:'2-digit', hour12:false });
};

/* pollutant meta for detail table */
const META={
  co  :{name:'CO',    unit:'ppm',   info:'Carbon monoxide…',                       low:4,   med:13},
  no  :{name:'NO',    unit:'ppb',   info:'Nitric oxide – precursor to NO₂ & O₃.',  low:53,  med:106},
  no2 :{name:'NO₂',   unit:'ppb',   info:'Nitrogen dioxide irritates lungs.',      low:53,  med:106},
  o3  :{name:'O₃',    unit:'ppb',   info:'Ozone can irritate the respiratory system.', low:33, med:66},
  co2 :{name:'CO₂',   unit:'ppm',   info:'CO₂ – indoor IAQ proxy.',                low:800, med:1200},
  pm25:{name:'PM₂.₅', unit:'µg/m³', info:'Fine particles penetrate deep lungs.',   low:12,  med:25}
};

const tbody      = document.querySelector('#sensor-table tbody');
const headers    = document.querySelectorAll('#sensor-table th');
const cardsWrap  = document.getElementById('sensor-cards');
const tableWrap  = document.querySelector('.table-scale-wrap');
const mqMobile   = window.matchMedia('(max-width: 640px)');
const isMobile   = () => mqMobile.matches;

let sensors = [];
let sortKey = 'name';
let sortDir = 1;

function keyVal(s,key){
  switch (key){
    case 'name'     : return s.name ?? '';
    case 'aqhi'     : return s.latest?.aqhi ?? -Infinity;
    case 'primary'  : return s.latest?.primary ?? '';
    case 'timestamp': return s.latest?.timestamp ? Date.parse(s.latest.timestamp) : 0;
    default         : return '';
  }
}

/* Try to attach a concentration to the declared primary pollutant */
const norm = s => (s ?? '').toString().toLowerCase().replace(/[^a-z0-9]/g,'');
function primaryReading(primaryLabel, pollutants){
  if (!primaryLabel) return null;
  let matchKey = null;
  for (const [k, meta] of Object.entries(META)){
    if (norm(meta.name)===norm(primaryLabel) || norm(k)===norm(primaryLabel)) { matchKey = k; break; }
  }
  if (!matchKey) return null;
  const val = pollutants[matchKey];
  if (val == null) return null;
  const { unit } = META[matchKey];
  return `${fmt(val, matchKey==='pm25'?1:2)} ${unit}`;
}

/* ---------- desktop rows (now with date) ---------------------------- */
function buildRowsDesktop(sensor){
  const { name='—' } = sensor;
  const { aqhi=null, primary='—', pollutants={}, timestamp=null } = sensor.latest ?? {};
  const lastSeen = fmtTS(timestamp, true); // include date+time on desktop

  const row = document.createElement('tr');
  row.className='sensor-row';
  row.innerHTML=`
    <td>${name}</td>
    <td style="background:${colourForAQHI(aqhi)};color:#fff;text-align:center;">${aqhi??'—'}</td>
    <td>${primary}</td>
    <td>${lastSeen}</td>`;

  const detail=document.createElement('tr');
  detail.className='sensor-detail';
  detail.style.display='none';
  detail.innerHTML=`<td colspan="4" class="detail-cell">
      <strong>AQHI:</strong> ${aqhi??'—'} (${aqhiBand(aqhi)} risk)<br>
      <strong>Main Contributor:</strong> ${primary}
      <table class="poll-table">
        <thead><tr><th>Pollutant</th><th>Conc.</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(META).map(([k,{name,unit,info,low,med}])=>{
            const val=pollutants[k];
            const status=val==null?'—':val<=low?'Low':val<=med?'Moderate':'High';
            return`<tr>
              <td title="${info}">${name}</td>
              <td>${fmt(val,k==='pm25'?1:2)} ${unit}</td>
              <td>${status}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </td>`;

  row.addEventListener('click',()=>{detail.style.display=detail.style.display==='none'?'table-row':'none';});
  return [row,detail];
}

/* ---------- mobile card -------------------------------------------- */
function buildCard(sensor){
  const { name='—' } = sensor;
  const { aqhi=null, primary='—', pollutants={}, timestamp=null } = sensor.latest ?? {};
  const conc = primaryReading(primary, pollutants) ?? '—';
  const last = fmtTS(timestamp, true);

  const card = document.createElement('article');
  card.className='sensor-card';
  card.setAttribute('role','button');
  card.setAttribute('tabindex','0');
  card.setAttribute('aria-expanded','false');

  card.innerHTML = `
    <div class="sensor-card__left">
      <h3 class="sensor-card__title">${name}</h3>
      <div class="sensor-card__meta"><strong>${primary}</strong> · ${conc}</div>
      <div class="sensor-card__meta">Last seen: ${last}</div>
    </div>
    <div class="sensor-card__right">
      <div class="sensor-card__aqhi" style="background:${colourForAQHI(aqhi)}">${aqhi ?? '—'}</div>
    </div>
    <div class="sensor-card__detail">
      <div><strong>AQHI:</strong> ${aqhi??'—'} (${aqhiBand(aqhi)} risk)</div>
      <div><strong>Main Contributor:</strong> ${primary}</div>
      <table class="poll-table" style="margin-top:.6rem">
        <thead><tr><th>Pollutant</th><th>Conc.</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(META).map(([k,{name,unit,info,low,med}])=>{
            const val=pollutants[k];
            const status=val==null?'—':val<=low?'Low':val<=med?'Moderate':'High';
            return`<tr>
              <td title="${info}">${name}</td>
              <td>${fmt(val,k==='pm25'?1:2)} ${unit}</td>
              <td>${status}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  const toggle=()=>{
    const open = card.getAttribute('aria-expanded')==='true';
    card.setAttribute('aria-expanded', String(!open));
  };
  card.addEventListener('click', toggle);
  card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); }});

  return card;
}

/* ---------- render (switches view) ---------------------------------- */
function render(){
  const data = [...sensors].sort((a,b)=>{
    const av=keyVal(a,sortKey), bv=keyVal(b,sortKey);
    return av>bv?sortDir : av<bv?-sortDir : 0;
  });

  if (isMobile()){
    // show cards, hide table
    if (tableWrap) tableWrap.style.display='none';
    if (cardsWrap){
      cardsWrap.innerHTML='';
      data.forEach(s => cardsWrap.appendChild(buildCard(s)));
      cardsWrap.style.display='grid';
    }
  } else {
    // show table, hide cards
    if (cardsWrap){ cardsWrap.innerHTML=''; cardsWrap.style.display='none'; }
    if (tableWrap) tableWrap.style.display='';
    tbody.innerHTML='';
    data.forEach(s=>{
      const [r1,r2]=buildRowsDesktop(s);
      tbody.appendChild(r1); tbody.appendChild(r2);
    });
  }
}

/* header clicks → resort (works for desktop; mobile headers are hidden) */
headers.forEach(th=>{
  th.addEventListener('click',()=>{
    const key=th.dataset.key;
    sortDir = (key===sortKey) ? -sortDir : 1;
    sortKey = key;
    headers.forEach(h=> h.textContent=h.textContent.replace(/ ▲| ▼/,''));
    th.textContent += sortDir===1 ? ' ▲' : ' ▼';
    render();
  });
});

/* Switch views on breakpoint changes */
mqMobile.addEventListener?.('change', render);
window.addEventListener('resize', ()=>{ /* fallback if older browsers */ });

/* initial fetch */
getSensorData()
  .then(({ sensors:list })=>{
    sensors = list;
    render();
  })
  .catch(err=>{
    console.error(err);
    tbody.innerHTML='<tr><td colspan="4">⚠ Failed to load data.</td></tr>';
  });
