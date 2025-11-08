class AqhiTable extends HTMLElement {
  async connectedCallback(){
    // Resolve defaults relative to this JS file’s directory
    const baseUrl = new URL('.', import.meta.url);
    const htmlUrl = this.getAttribute('src') || new URL('aqhi-table.html', baseUrl);
    const cssUrl  = this.getAttribute('css') || new URL('aqhi-table.css',  baseUrl);

    const shadow = this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    shadow.appendChild(link);

    const html = await (await fetch(htmlUrl)).text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    shadow.append(...wrapper.childNodes);
  }
}
customElements.define('aqhi-table', AqhiTable);
