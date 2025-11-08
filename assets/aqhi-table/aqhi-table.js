<script type="module">
class AqhiTable extends HTMLElement {
  async connectedCallback(){
    const base = this.getAttribute('base') || '/assets';
    const src  = this.getAttribute('src')  || `${base}/aqhi-table.html`;
    const css  = this.getAttribute('css')  || `${base}/aqhi-table.css`;

    const shadow = this.attachShadow({ mode: 'open' });

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = css + '?v=1';
    shadow.appendChild(link);

    const html = await (await fetch(src + '?v=1')).text();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    shadow.append(...wrapper.childNodes);
  }
}
customElements.define('aqhi-table', AqhiTable);
</script>
