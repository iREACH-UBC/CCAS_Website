import { getActiveAlertSensors } from './data.js';

export async function mountAqAlertBanner () {
  const alerts = await getActiveAlertSensors();
  if (!alerts?.length) return;                       // no banner

  // Prevent duplicates if called more than once
  if (document.querySelector('#aq-alert-banner')) return;

  // Prefer unique regions; fall back to unique site names
  const uniq = arr => [...new Set(arr.filter(Boolean))];
  const regions = uniq(alerts.map(a => a.region));
  const names   = uniq(alerts.map(a => a.name));
  const locations = regions.length ? regions : names;

  const label = locations.length <= 3
    ? locations.join(', ')
    : `${locations.slice(0, 3).join('; ')} and ${locations.length - 3} more`;

  const banner = document.createElement('div');
  banner.id = 'aq-alert-banner';
  banner.className = 'aq-alert-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');

  banner.innerHTML = `
    <div class="aq-alert-banner__inner">
      <span class="aq-alert-banner__icon" aria-hidden="true">⚠️</span>
      <span class="aq-alert-banner__text">
        Air quality advisory in effect for: <strong>${escapeHtml(label)}</strong>.
        <a class="aq-alert-banner__link"
           href="https://aqwarnings.gov.bc.ca/#issued-warnings"
           target="_blank" rel="noopener">View issued warnings</a>
      </span>
      <button class="aq-alert-banner__close" type="button"
              aria-label="Dismiss air quality advisory">×</button>
    </div>
  `;

  banner.querySelector('.aq-alert-banner__close')
    .addEventListener('click', () => banner.remove());

  // Insert just below the site header if present; else stick to the top
  const header = document.querySelector('.site-header');
  if (header) header.insertAdjacentElement('afterend', banner);
  else document.body.prepend(banner);
}

function escapeHtml (s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
