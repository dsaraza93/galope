'use strict';
/* ---------- Tienda pública ---------- */
const IC = {
  bag: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  whatsapp: '<svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M19.11 17.21c-.3-.15-1.76-.87-2.03-.97c-.27-.1-.47-.15-.67.15c-.2.3-.77.97-.94 1.16c-.17.2-.35.22-.65.08c-.3-.15-1.27-.47-2.42-1.51c-.9-.8-1.5-1.8-1.67-2.1c-.18-.3-.02-.46.13-.61c.13-.13.3-.35.45-.52c.15-.18.2-.3.3-.5c.1-.2.05-.37-.02-.52c-.08-.15-.67-1.62-.92-2.22c-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.49c0 1.46 1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49c.71.31 1.27.5 1.7.64c.72.23 1.37.2 1.89.12c.58-.09 1.76-.72 2.01-1.41c.25-.69.25-1.28.17-1.41c-.07-.12-.27-.2-.57-.35Z"/><path fill="currentColor" d="M16.05 3.2c-6.96 0-12.61 5.64-12.61 12.59c0 2.22.58 4.39 1.67 6.29L3.2 28.8l6.92-1.82a12.6 12.6 0 0 0 5.93 1.5h.01c6.95 0 12.6-5.64 12.6-12.6c0-3.37-1.31-6.54-3.69-8.92A12.51 12.51 0 0 0 16.05 3.2Zm0 22.96h-.01a10.5 10.5 0 0 1-5.36-1.47l-.38-.22l-4.11 1.08l1.1-4l-.25-.41a10.37 10.37 0 0 1-1.6-5.55c0-5.76 4.7-10.45 10.48-10.45a10.4 10.4 0 0 1 7.43 3.08a10.36 10.36 0 0 1 3.07 7.38c0 5.77-4.7 10.46-10.47 10.46Z"/></svg>',
  instagram: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.15 1.15 0 1 1 0 2.3a1.15 1.15 0 0 1 0-2.3ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0 2.2a2.8 2.8 0 1 0 0 5.6a2.8 2.8 0 0 0 0-5.6Z"/></svg>',
  tiktok: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.52 2h2.64c.22 1.88 1.3 3.62 3.02 4.55v2.73a7.3 7.3 0 0 1-3-1.17v6.35a5.45 5.45 0 1 1-5.44-5.43c.27 0 .54.02.8.06v2.67a2.9 2.9 0 1 0 2.98 2.7V2Z"/></svg>'
};
const BENEFIT_ICONS = {
  truck:'<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  'credit-card':'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  'heart-handshake':'<path d="M12 21s-8-5-9-10c-1-5 5-8 9-3 4-5 10-2 9 3-1 5-9 10-9 10z"/><path d="M9 13l2 2 4-4"/>',
  'messages-square':'<path d="M4 5h14v10H9l-5 4V5zM8 9h7M8 12h5"/>',
  'package-check':'<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M16 15l2 2 3-4"/>',
  'shield-check':'<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6zM8 12l3 3 5-6"/>',
  gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-7 0-8-7-4-7 2 0 4 3 4 7Zm0 0c7 0 8-7 4-7-2 0-4 3-4 7Z"/>',
  store:'<path d="M3 10h18l-2-6H5zM5 10v11h14V10M9 21v-7h6v7"/>',
};
const paymentBadges = (extra='') => `<span class="payment-brands" aria-label="Medios de pago"><span class="pay-badges ${extra}">${['Visa','Mastercard','PSE','Nequi','Addi','Sistecrédito'].map(paymentBadge).join('')}</span></span>`;
const benefitIcon = (name) => `<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BENEFIT_ICONS[name]||BENEFIT_ICONS.gift}</svg>`;
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento lleno o bloqueado */ } };

let cart = lsGet('galope_cart', []);   // [{id, q}] — solo ids y cantidades; el precio real lo pone el servidor
let favs = lsGet('galope_fav', []);
let world = '', ageRange = '', cat = '', q = '', toysOnly = false, stimOnly = false, offersOnly = false, favOnly = false, si = 0, tm, paused = false, manualPause = false, vq = 1;
const D = 6500;

async function loadStore() {
  S = await api('/store');
  cart = cart.filter((c) => prod(c.id)).map((c) => ({ id: c.id, q: readPendingBold() ? c.q : Math.min(c.q, prod(c.id).stock) })).filter((c) => c.q > 0);
  favs = favs.filter((id) => prod(id));
  lsSet('galope_cart', cart);
}

// A product hash is a shareable URL, including when opened in a new tab.
function productUrl(id) { return location.origin+location.pathname+'#producto-'+id; }
async function copyProductLink(id) {
  try {await navigator.clipboard.writeText(productUrl(id));toast('Enlace del producto copiado');}
  catch {const input=document.querySelector('#product-link');if(input){input.focus();input.select();toast('Enlace seleccionado. Puedes copiarlo.');}else toast(productUrl(id));}
}
function openProductHash() {
  const match = /^#producto-([1-9]\d*)$/.exec(location.hash);
  if (!match) return;
  if (prod(+match[1])) view(+match[1]); else toast('Este producto ya no está disponible');
}
function bannerMedia(url,fit,title) {
  const cls = 'banner-media fit-' + (fit==='cover'?'cover':'contain');
  return /\.(mp4|webm)$/.test(url)
    ? `<video class="${cls}" src="${esc(url)}" muted loop playsinline controls preload="metadata" aria-label="${esc(title)}"></video>`
    : `<img class="${cls}" src="${esc(url)}" alt="${esc(title)}" decoding="async">`;
}
function bannerProduct(b) {
  try {
    const url=new URL(b.buttonUrl||'',location.href);
    const match=/^#producto-([1-9]\d*)$/.exec(url.hash);
    return url.origin===location.origin && url.pathname===location.pathname && match ? prod(+match[1]) : null;
  } catch {return null;}
}
function bannerOffer(b) {
  const product=bannerProduct(b);
  if(!product)return `<b>${esc(b.off||'')}</b>`;
  const sale=product.old>product.price;
  return `<div class="banner-price"><b>${COP(product.price)}</b>${sale?`<del>${COP(product.old)}</del><span class="banner-saving">−${Math.round((1-product.price/product.old)*100)}%</span>`:''}</div>`;
}
function bannerLink(b,cls) {
  const url = String(b.buttonUrl||'').trim();
  // Defense in depth for legacy or imported settings.
  const safe = /^(https?:\/\/|\/(?![\/\\])|#producto-[1-9]\d*$)/i.test(url) && !/[\\\u0000-\u0020]/.test(url);
  return safe ? `<a class="${cls}" href="${esc(url)}">${esc(b.cta)}</a>`
    : `<button class="${cls}" data-act="go" data-arg="${esc(b.cat||'')}">${esc(b.cta)}</button>`;
}

function renderStore() {
  document.body.classList.add('store-page');
  document.body.classList.remove('mobile-menu-open');
  manualPause=false;
  const sl = S.slides;
  const CATS = S.categories;
  // Desplegables alimentados por categorías con productos reales de cada mundo.
  const worldMenu = (w, title) => {
    const names = [...new Set(S.products.filter((p) => (p.world === w || p.world === 'unisex')).flatMap((p) => p.categories || [p.cat]))].filter(Boolean);
    return `<details class="nav-group"><summary>${title}</summary><div class="nav-drop"><button type="button" data-act="world" data-arg="${w}">Ver todo ${title}</button>${names.map((name) => `<button type="button" data-act="worldcat" data-arg="${w}|${esc(name)}">${esc(name)}</button>`).join('')}</div></details>`;
  };
  $('#app').innerHTML = `<div class="bar">${esc(S.settings.note)}</div>
<header class="top store-header"><div class="wrap w"><button class="mobile-menu-toggle ic" type="button" data-act="mobilemenu" aria-label="Abrir menú" aria-controls="store-nav" aria-expanded="false"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button><a class="brand" href="#" aria-label="Inicio"><img src="/img/logo.webp" alt="${esc(S.settings.name)}"></a>
<nav class="nav" id="store-nav" aria-label="Principal"><a href="#" data-act="home">Inicio</a>${worldMenu("hombre", "Hombre")}${worldMenu("mujer", "Mujer")}<a href="#" data-act="world" data-arg="unisex">Unisex</a><a href="#" data-act="scroll" data-arg="cats">Categorías</a><a href="#" data-act="offers">Ofertas</a></nav>
<div class="search"><input id="q" type="search" placeholder="Busca sombreros, botas, camisas…" value="${esc(q)}" aria-label="Buscar productos" aria-controls="search-results" aria-expanded="false" autocomplete="off" maxlength="60"><div id="search-results" class="search-results" role="listbox" hidden></div></div>
<span class="header-spacer" style="flex:1"></span>
<button class="ic" data-act="favs" aria-label="Favoritos">${IC.heart}<b class="fn" hidden></b></button><button class="ic" data-act="cart" aria-label="Carrito">${IC.bag}<b class="cn" hidden></b></button></div></header>
<button class="mobile-menu-shade" type="button" data-act="closemenu" tabindex="-1" aria-label="Cerrar menú"></button>
<main class="wrap w"><section class="galope-hero" aria-labelledby="galope-heading"><div class="galope-hero-copy"><span class="galope-eyebrow">GALOPE · TIENDA LLANERA</span><h1 id="galope-heading">Vístete como se <em>vive</em> en el llano.</h1><p>Sombreros, botas, camisas baqueras y todo lo que lleva la tradición llanera, para hombre y mujer.</p><div class="galope-chips">${['Sombreros','Botas','Camisas baqueras','Cotizas','Correas'].map(c=>`<button data-act="go" data-arg="${c}">${c}</button>`).join('')}</div><button class="btn" data-act="browse">Comprar ahora <span aria-hidden="true">→</span></button></div><div class="galope-hero-art"><img src="/img/logo.webp" alt="Galope Tienda Llanera"></div></section><section class="hz${sl.length?'':' no-banners'}" id="ofertas"><div class="bn" id="bn" aria-roledescription="carrusel" aria-label="Ofertas destacadas">
${sl.map((s, i) => {
    const visual = s.customImage || (s.bg === 'photo' ? '/img/play.webp' : '/img/' + s.img + '.webp');
    const media=s.mobileImage?`<div class="campaign-desktop">${bannerMedia(visual,'artwork',s.title)}</div><div class="campaign-mobile">${bannerMedia(s.mobileImage,'artwork',s.title)}</div>`:bannerMedia(visual,'artwork',s.title);
    const video=/\.(mp4|webm)$/.test(visual)||/\.(mp4|webm)$/.test(s.mobileImage||'');
    return `<div class="sl banner-full banner-fit-artwork${i?'':' on'}">${media}${bannerLink(s,'artwork-target'+(video?' artwork-video':''))}</div>`;
  }).join('')}
<button class="banner-pause" data-act="bannerpause" aria-label="Pausar carrusel" aria-pressed="false">II</button><button class="arr l" data-act="prev" aria-label="Banner anterior">‹</button><button class="arr r" data-act="next" aria-label="Banner siguiente">›</button><div class="dots">${sl.map((s, i) => `<button aria-label="Ir a la diapositiva ${i + 1}" data-act="slide" data-arg="${i}"><i></i></button>`).join('')}</div></div>
</section>
${(S.sidePromos||[]).some(p=>p.active)?`<section class="galope-side-promos" aria-label="Promociones">${S.sidePromos.filter(p=>p.active).map(p=>`<article class="galope-promo-${esc(p.theme)}">${p.customImage?`<div class="galope-side-media">${bannerMedia(p.customImage,p.mediaFit,p.title)}</div>`:''}<small>${esc(p.eyebrow)}</small><h2>${esc(p.title)}</h2>${bannerLink({...p,cat:p.category},'btn')}</article>`).join('')}</section>`:''}
<section class="trust-horizontal" aria-labelledby="trust-cloud-title"><div class="trust-cloud-inner"><h2 id="trust-cloud-title">¿Por qué comprar <em>con nosotros?</em></h2><p class="trust-cloud-sub">Beneficios que acompañan tu compra</p><div class="trust-carousel" id="trust-carousel" aria-label="Beneficios de Galope"><div class="trust" id="trust-track">${(S.settings.benefits||[]).filter(b=>b.active).map((b,i)=>`<article class="trust-benefit" style="--trust-index:${i}"><span class="trust-benefit-icon">${benefitIcon(b.icon)}</span><span class="trust-benefit-copy"><b>${esc(b.title)}</b><small>${esc(b.description)}</small></span></article>`).join('')}</div></div><div class="trust-controls" aria-label="Desplazar beneficios"><button class="trust-nav" type="button" data-act="trustprev" aria-label="Beneficio anterior">‹</button><div class="trust-dots" id="trust-dots" aria-label="Posición del carrusel"></div><button class="trust-nav" type="button" data-act="trustnext" aria-label="Siguiente beneficio">›</button></div></div></section>
<section class="sec" id="cats"><div class="sec-h"><h2>La tradición se lleva <em>con estilo.</em></h2><div class="stage-nav" role="group" aria-label="Explorar por público"><span>Explorar:</span><button type="button" data-act="world" data-arg="hombre">Hombre</button><button type="button" data-act="world" data-arg="mujer">Mujer</button></div></div><div class="cgrid">${CATS.slice(0,6).map((c, i) => `<button class="cc" data-act="go" data-arg="${esc(c[0])}" style="--t:${CT[i % CT.length]}"><div class="ci"><img src="/img/${esc(c[1])}.svg" alt=""></div><b>${esc(c[0])}</b><small>Ver productos</small></button>`).join('')}</div></section>
<section class="fe"><div class="t"><span class="galope-eyebrow">HECHO PARA LLEVAR LO NUESTRO</span><h2>Del llano, <em>para todos los días.</em></h2><p>Encuentra ese detalle que habla de ti. Explora nuestra selección de sombreros, botas y accesorios llaneros.</p><button class="btn" data-act="browse">Explorar colección →</button></div><div class="im galope-promo-art" aria-hidden="true"><span class="galope-pair"></span></div></section>
<section class="sec" id="prods"><div class="sec-h"><h2>Tu esencia. <em>Tu estilo llanero.</em></h2><span id="cnt" style="color:var(--mut)"></span></div><div class="cats" id="chips"></div><div class="pgrid" id="grid"></div></section>
<section class="nl nl-club-visual galope-club" id="contacto" aria-labelledby="club-title"><div class="galope-club-art"><img class="galope-club-photo" src="/img/club-galope.webp" alt="" loading="lazy" width="1122" height="1402"><span class="galope-club-label"><img src="/img/sombreros.svg" alt="" width="28" height="28"> CLUB GALOPE</span><div class="galope-club-art-copy"><span>PARA QUIENES LLEVAN EL LLANO DENTRO</span><p>Lo nuestro<br>se lleva <em>puesto.</em></p><small>Galope · Tienda Llanera</small></div></div><div class="galope-club-content"><span class="galope-club-eyebrow"><i aria-hidden="true"></i> EL ESTILO NOS UNE</span><h2 id="club-title">Ser parte del llano <em>tiene sus ventajas.</em></h2><p class="galope-club-intro">Únete al Club Galope y recibe novedades y promociones exclusivas por WhatsApp.</p><div class="galope-club-perks" aria-label="Novedades del club"><span>Nuevas colecciones</span><span>Promociones</span><span>Estilo llanero</span></div><form class="club-form" data-form="subscribe"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="club-fields"><label class="club-field"><span>Tu nombre <small>(opcional)</small></span><input name="name" maxlength="60" autocomplete="given-name" placeholder="Ej. Laura"></label><label class="club-field"><span>WhatsApp <b aria-hidden="true">*</b></span><input required name="tel" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="Número de celular" aria-label="WhatsApp"></label></div><fieldset class="club-interests"><legend>¿Qué productos te interesan?</legend><label><input type="radio" name="interest" value="hombre"> Hombre</label><label><input type="radio" name="interest" value="mujer"> Mujer</label><label><input type="radio" name="interest" value="ambos" checked> Ambos</label></fieldset><label class="club-consent"><input type="checkbox" name="consent" required><span>Autorizo a Galope a enviarme novedades y promociones por WhatsApp. Acepto la política de tratamiento de datos y puedo solicitar mi baja cuando quiera.</span></label><button class="btn" type="submit">Unirme al club</button></form><p class="galope-club-footnote">Tú eliges lo que te interesa. Puedes solicitar tu baja cuando quieras.</p></div></section></main>
<div class="galope-footer-horizon" aria-hidden="true"><i></i><svg viewBox="0 0 1200 24" preserveAspectRatio="none"><path fill="currentColor" d="M0 24V8C150 14 300 4 450 10S750 6 900 14S1100 5 1200 9V24Z"/></svg></div>
<footer class="galope-footer"><div class="wrap w fg"><div class="footer-brand"><img src="/img/logo.webp" alt="Galope Tienda Llanera" width="120" height="120"><p>Los mejores diseños en productos llaneros. Villavicencio, Meta.</p></div><div><h3>Explora</h3><a href="#" data-act="scroll" data-arg="cats">Categorías</a><a href="#" data-act="scroll" data-arg="prods">Productos</a><a href="#" data-act="offers">Ofertas</a></div><div><h3>Atención</h3><a href="#" data-act="wa">WhatsApp</a><p class="footer-location">Villavicencio, Colombia</p><a href="https://www.instagram.com/galopetiendallaneraco" target="_blank" rel="noopener noreferrer">Instagram</a><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">Facebook</a><a class="footer-admin" href="#admin">Acceso administrador</a></div></div></footer>
<nav class="mobile-nav" aria-label="Accesos de la tienda"><button type="button" data-act="home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9"/></svg><span>Inicio</span></button><button type="button" data-act="browse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Catálogo</span></button><button type="button" data-act="focussearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><span>Buscar</span></button><button type="button" data-act="favs">${IC.heart}<span>Favoritos</span><b class="fn" hidden></b></button><button type="button" data-act="cart">${IC.bag}<span>Carrito</span><b class="cn" hidden></b></button></nav>
<button class="wa" data-act="wa" aria-label="Abrir WhatsApp" title="WhatsApp">${IC.whatsapp}<span class="sr">WhatsApp</span></button>`;
  // Carrusel horizontal autónomo: solo desplaza el contenedor, nunca la página.
  const trustTrack = $('#trust-track');
  if (trustTrack) {
    const trustItems = [...trustTrack.children];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dots = $('#trust-dots');
    let trustPosition = 0;
    if (dots) dots.innerHTML = trustItems.map((_,i)=>`<button type="button" aria-label="Ver beneficio ${i+1}" class="${i===0?'on':''}" data-trust-index="${i}"></button>`).join('');
    const goTrust = (idx) => {
      if (!trustItems.length) return;
      trustPosition = (idx + trustItems.length) % trustItems.length;
      trustTrack.scrollTo({left:trustItems[trustPosition].offsetLeft - trustItems[0].offsetLeft,behavior:reduced?'instant':'smooth'});
      dots?.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===trustPosition));
    };
    $('#app').querySelector('[data-act="trustnext"]')?.addEventListener('click', () => goTrust(trustPosition+1));
    $('#app').querySelector('[data-act="trustprev"]')?.addEventListener('click', () => goTrust(trustPosition-1));
    dots?.addEventListener('click',e=>{const b=e.target.closest('[data-trust-index]');if(b)goTrust(Number(b.dataset.trustIndex));});
    if (!reduced && trustItems.length > 4) {
      const timer = window.setInterval(() => {
        if (!trustTrack.isConnected) {window.clearInterval(timer);return;}
        if (!trustTrack.matches(':hover') && !trustTrack.contains(document.activeElement) && !document.hidden) goTrust(trustPosition+1);
      }, 5200);
    }
  }
  $('#q').addEventListener('input', (e) => {
    q = e.target.value;
    // Una nueva búsqueda siempre consulta TODO el catálogo, incluso si había un filtro activo.
    cat = ''; world = ''; ageRange = ''; toysOnly = false; stimOnly = false; offersOnly = false; favOnly = false;
    renderGrid(); renderSearchResults();
  });
  $('#q').addEventListener('focus', renderSearchResults);
  $('#q').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      hideSearchResults();
      goTo('prods');
    }
    if (e.key === 'Escape') hideSearchResults();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search')) hideSearchResults();
  });
  const navGroups = [...document.querySelectorAll('header.top .nav-group')];
  const closeMenus = (except = null) => navGroups.forEach((g) => { if (g !== except) g.open = false; });
  navGroups.forEach((g) => {
    g.addEventListener('toggle', () => { if (g.open) closeMenus(g); });
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
      g.addEventListener('pointerenter', () => { closeMenus(g); g.open = true; });
      g.addEventListener('pointerleave', () => { g.open = false; });
    }
  });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('header.top .nav-group')) closeMenus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
  const bn = $('#bn');
  bn.addEventListener('focusin',()=>{paused=true;clearTimeout(tm);});
  bn.addEventListener('focusout',e=>{if(!bn.contains(e.relatedTarget)){paused=false;slide(si);}});
  bn.addEventListener('mouseenter', () => { paused = true; clearTimeout(tm); bn.classList.add('paused'); });
  bn.addEventListener('mouseleave', () => { paused = false; bn.classList.remove('paused'); slide(si); });
  let x0 = null;
  bn.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  bn.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) slide(si + (e.clientX < x0 ? 1 : -1)); x0 = null; });
  renderGrid(); upd(); si = 0; slide(0);
  openProductHash();
}

function slide(i) {
  const els = $$('.sl');
  if (!els.length) return;
  si = (i + els.length) % els.length;
  els.forEach((e, k) => e.classList.toggle('on', k === si));
  els.forEach((e,k)=>e.querySelectorAll('video').forEach(v=>{if(k===si&&!RM&&!document.hidden&&v.getClientRects().length)v.play().catch(()=>{});else v.pause();}));
  $('#bn').classList.toggle('bg-photo-on', els[si].classList.contains('bg-photo'));
  const ds = $$('.dots button');
  ds.forEach((d) => d.classList.remove('on', 'done'));
  void document.body.offsetWidth;
  ds.forEach((d, k) => { d.style.setProperty('--d', D + 'ms'); if (k < si) d.classList.add('done'); if (k === si) d.classList.add('on'); });
  clearTimeout(tm);
  if (!RM && !paused && !manualPause && els.length > 1) tm = setTimeout(() => slide(si + 1), D);
}
setInterval(() => {
  $$('.cd[data-end]').forEach((c) => {
    const deadline = new Date(c.dataset.end).getTime();
    if (!Number.isFinite(deadline)) { c.hidden=true; return; }
    const seconds=Math.max(0,Math.floor((deadline-Date.now())/1000));
    if (!seconds) { c.textContent='Promoción finalizada'; return; }
    const days=Math.floor(seconds/86400), h=Math.floor((seconds%86400)/3600), m=Math.floor((seconds%3600)/60), sec=seconds%60;
    c.textContent='Termina en '+(days?days+' d · ':'')+[h,m,sec].map(x=>String(x).padStart(2,'0')).join(':');
  });
},1000);

// Comparación flexible: ignora acentos, mayúsculas y dobles espacios.
const normSearch = (value) => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
function matchSearch(p, text) {
  const words = normSearch(text).split(' ').filter(Boolean);
  if (!words.length) return true;
  const haystack = normSearch([p.name, p.desc, p.cat, ...(p.feats || [])].join(' '));
  return words.every((word) => haystack.includes(word));
}
function hideSearchResults() {
  const box = $('#search-results'), input = $('#q');
  if (box) box.hidden = true;
  if (input) input.setAttribute('aria-expanded', 'false');
}
function renderSearchResults() {
  const box = $('#search-results'), input = $('#q');
  if (!box || !input) return;
  if (!normSearch(q)) return hideSearchResults();
  const matches = S.products.filter((p) => matchSearch(p, q));
  box.innerHTML = `<div class="search-heading">${matches.length} resultado${matches.length === 1 ? '' : 's'} para «${esc(q)}»</div>` +
    (matches.length ? matches.slice(0, 5).map((p) => `<button type="button" class="search-hit" data-act="view" data-arg="${p.id}" role="option" aria-label="Ver ${esc(p.name)}, ${COP(p.price)}"><span class="search-thumb" style="--thumb-bg:${tint(p)}">${vis(p)}</span><span class="search-hit-info"><span class="search-hit-name">${esc(p.name)}</span><small class="search-hit-meta">${esc(p.cat)}</small></span><b class="search-hit-price">${COP(p.price)}</b></button>`).join('') : '<div class="search-none">No hay coincidencias. Prueba otra palabra.</div>') +
    (matches.length ? '<button type="button" class="search-all" data-act="searchall">Ver resultados en el catálogo →</button>' : '');
  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
// Clasificación persistida en BD, independiente de la categoría.
function isMujerCategory(category) {
  return S.products.some((p) => (p.categories || [p.cat]).includes(category) && p.world === 'mujer');
}
function renderGrid() {
  if (!$('#grid')) return;
  const list = S.products.filter((p) => (!offersOnly || p.old > p.price) && (!stimOnly || /estimul|aprendiz|didáctic|didactic|sensorial|montessori|educativ|motric|gimnasio|caminador|encajab|bloques/i.test([...(p.categories || [p.cat]),p.name,p.desc].join(' '))) && (!toysOnly || /jueg|juguet|muñec|munec|carros|pistas|bloques|figuras|puzzle|rompecabez|peluche|didáctic|didactic|estimula/i.test([...(p.categories || [p.cat]), p.name].join(' '))) && (!world || (p.world === world || (world !== 'unisex' && p.world === 'unisex'))) && (!cat || (p.categories || [p.cat]).includes(cat)) && (!ageRange || (() => { const [min,max] = ageRange.split('-').map(Number); return (p.ageMin ?? 0) <= max && (p.ageMax ?? 36) >= min; })()) && (!favOnly || favs.includes(p.id)) && matchSearch(p, q));
  const shownCategories = S.categories.filter((c) => !world || S.products.some((p) => (p.world === world || (world !== 'unisex' && p.world === 'unisex')) && (p.categories || [p.cat]).includes(c[0])));
  $('#chips').innerHTML = `<label class="catalog-filter">Categoría <select aria-label="Filtrar productos por categoría" data-chg="catalogcat"><option value="">Todas las categorías</option>${shownCategories.map((c) => `<option value="${esc(c[0])}" ${cat === c[0] ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}</select></label><label class="catalog-filter">Para <select aria-label="Filtrar productos por público" data-chg="audience"><option value="">Todos</option>${[['hombre','Hombre'],['mujer','Mujer'],['unisex','Unisex']].map(([v,t])=>`<option value="${v}" ${world===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
  document.querySelectorAll('.stage-nav [data-act=world]').forEach((b) => { b.classList.toggle('on', b.dataset.arg === world); b.setAttribute('aria-pressed', String(b.dataset.arg === world)); });
  $('#cnt').textContent = (offersOnly ? 'Ofertas · ' : world === 'mujer' ? 'Mujer · ' : world === 'hombre' ? 'Hombre · ' : world === 'unisex' ? 'Unisex · ' : '') + list.length + ' productos';
  $('#grid').innerHTML = list.length ? list.map((p) => {
    const dc = p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0, im = imgs(p);
    return `<article class="pc" style="--t:${tint(p)}"><button class="pi" data-act="view" data-arg="${p.id}" aria-label="Ver detalles de ${esc(p.name)}">${vis(p)}${im[1] ? `<span class="alt">${pic(im[1], p.name)}</span>` : ''}${dc ? `<span class="off">-${dc}%</span>` : p.badge ? `<span class="off">${esc(p.badge)}</span>` : ''}${im.length > 1 ? `<span class="cnt">${im.length} fotos</span>` : ''}</button><button class="hb" data-act="fav" data-arg="${p.id}" aria-label="${favs.includes(p.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${esc(p.name)}" aria-pressed="${favs.includes(p.id)}">${favs.includes(p.id) ? '♥' : '♡'}</button><div class="cb"><small>${esc(p.cat)}</small><h3>${esc(p.name)}</h3><p class="ds">${esc(p.desc)}</p><div class="chips2">${p.stock > 0 && p.stock <= 5 ? `<span class="lo">Quedan ${p.stock}</span>` : ''}${p.stock < 1 ? '<span class="lo">Agotado</span>' : ''}</div><div class="pr"><b>${COP(p.price)}</b>${p.old > p.price ? `<s>${COP(p.old)}</s>` : ''}</div><div class="act"><button class="btn" data-act="view" data-arg="${p.id}" aria-label="Ver detalles de ${esc(p.name)}"><span class="details-full">Ver detalles</span><span class="details-short" aria-hidden="true">Ver</span></button><button class="ib" data-act="add" data-arg="${p.id}" ${p.stock < 1 ? 'disabled' : ''} aria-label="Agregar ${esc(p.name)} al carrito">${IC.bag}</button></div></div></article>`;
  }).join('') : '<div class="empty" style="grid-column:1/-1">No encontramos productos. Prueba otra palabra o elige otra categoría.</div>';
}

function upd() {
  const n = cart.reduce((a, c) => a + c.q, 0);
  $$('.cn').forEach((b) => { b.textContent = n; b.hidden = !n; });
  $$('.fn').forEach((b) => { b.textContent = favs.length; b.hidden = !favs.length; });
}
const saveCart = () => lsSet('galope_cart', cart);

const PAYMENT_LOGOS = Object.freeze({
  Visa: '/img/payments/visa.webp',
  Mastercard: '/img/payments/mastercard.webp',
  PSE: '/img/payments/pse.webp',
  Nequi: '/img/payments/nequi.webp',
  Addi: '/img/payments/addi.webp',
  'Sistecrédito': '/img/payments/sistecredito.webp',
});
const paymentBadge = (label) => `<span class="pay-brand" title="${esc(label)}"><img src="${esc(PAYMENT_LOGOS[label])}" alt="${esc(label)}" loading="lazy"></span>`;
const paymentBadgesRow = (items, extra='') => `<div class="pay-badges ${extra}">${items.map(item=>paymentBadge(Array.isArray(item)?item[0]:item)).join('')}</div>`;

function add(id, k = 1) {
  const p = prod(id), l = cart.find((c) => c.id === p.id), have = l ? l.q : 0;
  if (have + k > p.stock) return toast('Solo quedan ' + p.stock + ' unidades');
  l ? (l.q += k) : cart.push({ id: p.id, q: k });
  saveCart(); toast('Agregado al carrito'); upd();
}

function view(id) {
  const p=prod(id);if(!p)return toast('Este producto ya no está disponible');
  const hash='#producto-'+p.id;
  if(location.hash!==hash)history.pushState({bcProduct:true},'',hash);
  const im = imgs(p), dc = p.old > p.price ? Math.round((1 - p.price / p.old) * 100) : 0;
  vq = 1;
  $('#modal').className = 'modal wide';
  $('#modal').innerHTML = `<button class="x" data-act="close" aria-label="Cerrar">✕</button><div class="pd"><div class="gal"><div class="gm" id="gm" style="--t:${tint(p)}">${vis(p)}${dc ? `<span class="off">-${dc}%</span>` : ''}</div>${im.length > 1 ? `<div class="th">${im.map((x, i) => `<button class="${i ? '' : 'on'}" data-act="setimg" data-arg="${p.id}:${i}" aria-label="Foto ${i + 1}" style="--t:${tint(p)}">${pic(x, '')}</button>`).join('')}</div>` : ''}</div>
<div class="inf"><small>${esc(p.cat)}</small><h2>${esc(p.name)}</h2><div class="pr"><b style="font-size:34px">${COP(p.price)}</b>${p.old > p.price ? `<s>${COP(p.old)}</s>` : ''}</div>${window.BCAddi?.markup(p.price) || ''}<p>${esc(p.desc)}</p>
${p.feats.length ? `<ul class="fl">${p.feats.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
<p class="stk ${p.stock < 1 ? 'out' : ''}">${p.stock > 0 ? (p.stock <= 5 ? 'Quedan solo ' + p.stock + ' unidades' : 'Disponible') : 'Agotado'}</p>
<div class="buy"><span class="qty big"><button data-act="vqc" data-arg="-1:${p.id}" aria-label="Menos">−</button><b id="vq">1</b><button data-act="vqc" data-arg="1:${p.id}" aria-label="Más">+</button></span><button class="btn" ${p.stock < 1 ? 'disabled' : ''} data-act="addview" data-arg="${p.id}">Agregar al carrito</button></div>
<button class="lnk" ${p.stock < 1 ? 'disabled' : ''} data-act="buynow" data-arg="${p.id}">Comprar ahora</button>
<div class="pol payment-pol"><div class="pol-title">Medios de pago</div>${paymentBadgesRow([['Visa','visa'],['Mastercard','mastercard'],['PSE','pse'],['Nequi','nequi'],['Addi','addi'],['Sistecrédito','sistecredito']], 'in-modal compact-strip')}</div></div></div>`;
  const g = $('#gm');
  g.addEventListener('mousemove', (e) => { const r = g.getBoundingClientRect(); g.style.setProperty('--zx', (e.clientX - r.left) / r.width * 100 + '%'); g.style.setProperty('--zy', (e.clientY - r.top) / r.height * 100 + '%'); });
  openPanel($('#modal'));
  window.BCAddi?.activate();
}
function setImg(id, i) {
  const p = prod(id), g = $('#gm'), o = g.querySelector('.off');
  g.innerHTML = pic(imgs(p)[i], p.name); if (o) g.appendChild(o);
  $$('.th button').forEach((b, k) => b.classList.toggle('on', k === i));
}
function vqc(k, id) { vq = Math.max(1, Math.min(prod(id).stock, vq + k)); $('#vq').textContent = vq; }

/* ---------- Carrito y pedido ---------- */
const total = () => cart.reduce((a, c) => a + (prod(c.id)?.price || 0) * c.q, 0);
function drawer({refreshOnly=false} = {}) {
  const keep = {}; const old = $('#co');
  if (old) new FormData(old).forEach((v, k) => { keep[k] = v; });
  const items = cart.filter((c) => prod(c.id)), t = total();
  const logistics = S.settings.shipping || {pickupEnabled:false,deliveryEnabled:true,carrier:'Por definir',deliveryFee:0,estimatedDays:''};
  $('#drawer').innerHTML = `<div class="drawer-head" style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:30px">Tu carrito</h2><button class="x" data-act="close" aria-label="Cerrar">✕</button></div>
${readPendingBold() ? '<div class="payment-verification" role="status"><b>Tu pago está en verificación</b><span>No repitas la compra hasta confirmar el resultado.</span><button type="button" class="pill sm ghost" data-act="verifypayment">Consultar estado del pago</button></div>' : ''}
<div class="list">${items.length ? items.map((c) => {
    const p = prod(c.id);
    return `<div class="line"><div class="mini" style="--t:${tint(p)}">${vis(p)}</div><div><b>${esc(p.name)}</b><br><span class="qty"><button data-act="qty" data-arg="${p.id}:-1" aria-label="Menos">−</button>${c.q}<button data-act="qty" data-arg="${p.id}:1" aria-label="Más">+</button></span></div><b>${COP(p.price * c.q)}</b></div>`;
  }).join('') : '<div class="empty">Tu carrito está vacío. Encuentra tu próximo favorito llanero.</div>'}</div>
${items.length ? `<form id="co" data-form="order"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="checkout-section"><h3>Datos del comprador</h3><div class="checkout-fields-pair"><label class="fld">Nombre completo<input name="n" required minlength="2" maxlength="80" autocomplete="name" placeholder="Nombre y apellidos"></label><label class="fld">Celular<input name="t" type="tel" required inputmode="tel" maxlength="20" autocomplete="tel" placeholder="Número de contacto"></label></div><div class="checkout-fields-pair"><label class="fld">Tipo de documento<select name="documentType" required><option value="CC">Cédula de ciudadanía</option><option value="CE">Cédula de extranjería</option><option value="NIT">NIT</option><option value="PA">Pasaporte</option><option value="TI">Tarjeta de identidad</option></select></label><label class="fld">Número de documento<input name="documentNumber" required minlength="5" maxlength="20" autocomplete="off" placeholder="Sin puntos ni espacios" pattern="(?:[A-Za-z0-9]|-){5,20}" title="Entre 5 y 20 caracteres, letras, números o guion"></label></div></div><div class="checkout-section"><h3>Entrega</h3><fieldset class="checkout-fulfillment"><legend>¿Cómo quieres recibir tu compra?</legend><label><input type="radio" name="fulfillment" value="pickup" checked> <b>Retiro en tienda</b><small>Sin costo · ${esc(logistics.pickupAddress||'Consulta la dirección con la tienda')}</small></label><label><input type="radio" name="fulfillment" value="delivery"> <b>Envío a domicilio</b><small>Valor del transporte por cotizar, según la transportadora</small></label></fieldset><p id="checkout-shipping-note" class="checkout-shipping-note" hidden><b>Importante sobre el envío:</b> este pago cubre únicamente los productos. Una vez se confirme el pago, un asesor se comunicará contigo para informarte el costo del envío y coordinar la entrega. El envío se paga por separado y solo con tu aceptación.</p>
<div class="checkout-delivery-fields" hidden><div class="fld"><input name="d" minlength="5" maxlength="200" autocomplete="street-address" placeholder="Dirección de entrega" aria-label="Dirección"></div><label class="fld">Ciudad<input name="city" maxlength="90" autocomplete="address-level2" placeholder="Ej. Villavicencio"></label><label class="fld">Departamento<input name="region" maxlength="90" autocomplete="address-level1" placeholder="Ej. Meta"></label><div class="fld"><input name="detail" maxlength="120" placeholder="Apartamento, barrio o indicaciones (opcional)"></div></div>
</div><div class="checkout-section"><fieldset class="pay"><legend>Elige cómo pagar</legend><label class="checkout-payment-choice"><input type="radio" checked name="gateway" value="gateway"> <b>Tarjetas, PSE y otros métodos</b>${paymentBadgesRow([['Visa','visa'],['Mastercard','mastercard'],['PSE','pse'],['Nequi','nequi']], 'in-checkout compact-strip')}</label><label class="checkout-payment-choice" style="opacity:.62"><input type="radio" name="gateway" value="addi" disabled> <b>Addi · Compra a cuotas (próximamente)</b>${paymentBadgesRow([['Addi','addi']], 'in-checkout single compact-strip')}</label><label class="checkout-payment-choice" style="opacity:.62"><input type="radio" name="gateway" value="sistecredito" disabled> <b>Sistecrédito (próximamente)</b>${paymentBadgesRow([['Sistecrédito','sistecredito']], 'in-checkout single compact-strip')}</label></fieldset></div><div class="checkout-section checkout-summary"><h3>Resumen de compra</h3>
<div class="checkout-total"><span>Subtotal de productos</span><b>${COP(t)}</b></div><div class="checkout-total"><span>Envío</span><b id="checkout-shipping">Por cotizar</b></div><div class="checkout-total checkout-grand"><span>Total a pagar ahora</span><span id="checkout-total">${COP(t)}</span></div>${window.BCAddi?.markup(t) || ''}
<button class="pill pk" style="width:100%;margin-top:10px;padding:14px">Comprar</button></div></form>` : ''}`;
  const f = $('#co');
  if (f) Object.entries(keep).forEach(([k, v]) => { const el = f.elements[k]; if (!el) return; if (el.type === undefined) [...el].forEach((r) => { r.checked = r.value === v; }); else el.value = v; });
  if (f) {
    const updateDelivery = () => {
      const pickup = f.querySelector('[name="fulfillment"]:checked')?.value === 'pickup';
      const fields = f.querySelector('.checkout-delivery-fields'); if (fields) fields.hidden = pickup;
      const address = f.querySelector('[name="d"]'); if(address) address.required = !pickup;
      const shipLabel=f.querySelector('#checkout-shipping'); if(shipLabel) shipLabel.textContent=pickup?'Retiro sin costo':'Por cotizar';
      const quote=f.querySelector('#checkout-shipping-note'); if(quote) quote.hidden=pickup;
      const sum=f.querySelector('#checkout-total'); if(sum) sum.textContent=COP(t);
      window.BCAddi?.update(f,t);
    };
    f.querySelectorAll('[name="fulfillment"]').forEach(el=>el.addEventListener('change',updateDelivery));
    updateDelivery();
  }
  if(!refreshOnly)openPanel($('#drawer'));
  window.BCAddi?.activate();
}
function qty(id, k) {
  const c = cart.find((x) => x.id === +id), p = prod(id);
  if (c.q + k > p.stock) return toast('Solo quedan ' + p.stock + ' unidades');
  c.q += k; if (c.q < 1) cart = cart.filter((x) => x !== c);
  saveCart(); upd(); drawer();
}

async function submitOrder(form, btn) {
  if(readPendingBold()){
    await checkBoldReturn({quiet:false,restart:true});
    if(readPendingBold() || !cart.length)return;
  }
  const f=new FormData(form);
  if(f.get('gateway')==='addi') return toast('Selecciona tarjetas, PSE u otro método disponible.');
  const fulfillment=f.get('fulfillment')||'delivery';
  await busy(btn,async()=>{
    const intent=JSON.stringify({name:f.get('n'),tel:f.get('t'),documentType:f.get('documentType'),documentNumber:f.get('documentNumber'),fulfillment,addr:[f.get('d'),f.get('city'),f.get('region'),f.get('detail')],items:cart.map(c=>({id:c.id,q:c.q}))});
    let attempt;try{attempt=JSON.parse(sessionStorage.getItem('galope_checkout_attempt')||'null');}catch{}
    if(!attempt||attempt.intent!==intent){attempt={intent,key:crypto.randomUUID()};sessionStorage.setItem('galope_checkout_attempt',JSON.stringify(attempt));}
    const data=await api('/bold/start',{method:'POST',headers:{'Idempotency-Key':attempt.key},body:{
      name:f.get('n'),tel:f.get('t'),documentType:f.get('documentType'),documentNumber:f.get('documentNumber'),
      fulfillment,addr:fulfillment==='pickup'?'Retiro en tienda':[f.get('d'),f.get('city'),f.get('region'),f.get('detail')].filter(Boolean).join(', '),
      items:cart.map(c=>({id:c.id,q:c.q}))
    }});
    rememberBoldCheckout(data,cart);
    if($('#drawer').classList.contains('on'))drawer({refreshOnly:true});
    const launch=()=>{
      // Se cobra únicamente el subtotal de productos; el transporte se cotiza por separado.
      // La pasarela se abre en modal: el cliente NO vuelve a ingresar el precio.
      const config={
        orderId:data.orderId,
        currency:data.currency,
        amount:String(data.amount),
        apiKey:data.apiKey,
        integritySignature:data.integritySignature,
        description:data.description,
        renderMode:'embedded',
        customerData:JSON.stringify({
          fullName:String(f.get('n')||''),
          phone:String(f.get('t')||''),
          dialCode:'+57',
          documentType:String(f.get('documentType')||'CC'),
          documentNumber:String(f.get('documentNumber')||'')
        })
      };
      // En entorno local Bold exige localhost en lugar de 127.0.0.1.
      // Redirección en HTTPS cuando se publique la tienda.
      if(location.protocol==='https:') {
        config.redirectionUrl=location.origin+location.pathname+'?bold-return=1';
      }
      const checkout=new window.BoldCheckout(config);
      checkout.open();
      void checkBoldReturn({quiet:true,restart:true});
    };
    if(window.BoldCheckout) return launch();
    const script=document.createElement('script');script.src='https://checkout.bold.co/library/boldPaymentButton.js';
    script.onload=launch;script.onerror=()=>toast('No se pudo abrir el pago seguro. Intenta de nuevo.');document.head.append(script);
  });
}

async function submitSubscribe(form, btn) {
  const f = new FormData(form);
  await busy(btn, async () => {
    await api('/subscribe', { method: 'POST', body: { name: f.get('name'), tel: f.get('tel'), interest: f.get('interest'), consent: f.has('consent'), website: f.get('website') } });
    toast('¡Bienvenido al Club Galope!'); form.reset();
  });
}
const waGeneral = () => openWA('https://wa.me/' + S.settings.wa + '?text=' + encodeURIComponent('Hola, quisiera información sobre sus productos'));

matchMedia('(max-width:820px)').addEventListener('change',()=>{if(document.querySelector('#bn'))slide(si);});
