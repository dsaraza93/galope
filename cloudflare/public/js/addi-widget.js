/* Galope — widget informativo oficial Addi. NO procesa pagos. */
(() => {
  'use strict';
  // Coloca aquí el ally_slug REAL que Addi asignó a Galope.
  // No es una llave secreta. Sin él, el widget NO se muestra.
  const ALLY_SLUG = ''; // Al recibirlo, coloca el identificador público proporcionado por Addi
  const SCRIPT_URL = 'https://s3.amazonaws.com/widgets.addi.com/bundle.min.js';
  const valid = /^[a-zA-Z0-9_-]{2,100}$/.test(ALLY_SLUG);
  let loading = false;
  const markup = price => {
    const n = Math.round(Number(price));
    if (!valid || !Number.isSafeInteger(n) || n <= 0) return '';
    return `<div class="bc-addi-widget" style="margin:10px 0 12px"><addi-widget price="${n}" ally-slug="${ALLY_SLUG}"></addi-widget></div>`;
  };
  const activate = () => {
    if (!valid || !document.querySelector('addi-widget')) return;
    if (loading || document.querySelector('script[data-bc-addi]')) return;
    loading = true;
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.dataset.bcAddi = '1';
    script.onerror = () => { loading = false; script.remove(); console.warn('No se pudo cargar el widget informativo de Addi'); };
    document.head.appendChild(script);
  };
  const update = (form, price) => {
    const node = form.querySelector('addi-widget');
    if (!node) return;
    const amount = Math.round(Number(price));
    if (Number.isSafeInteger(amount) && amount > 0) node.setAttribute('price', String(amount));
  };
  window.BCAddi = Object.freeze({markup,activate,update});
})();
