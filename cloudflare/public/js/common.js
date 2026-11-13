'use strict';
/* Utilidades compartidas: DOM, formato, API, notificaciones y paneles */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(+n || 0);
const TINTS = ['#f7e6ee', '#ece4f6', '#f4ede4'];
const CT = ['#f7e1ea', '#f1e6f8', '#e8eff9', '#f8efe0', '#efe6fa', '#fbe4ee'];
const RM = matchMedia('(prefers-reduced-motion:reduce)').matches;

/* Estado de la tienda (viene del servidor) */
let S = { settings: { name: 'Galope', wa: '', free: 0, note: '', pay: [] }, categories: [], products: [], slides: [], sidePromos: [] };

/* Imágenes: las de /img/ son ilustraciones (se ven contenidas); las subidas son fotos (cubren el recuadro) */
const pic = (u, n) => (u ? `<img ${u.startsWith('/img/') ? '' : 'class="full" '}src="${esc(u)}" alt="${esc(n)}" loading="lazy">` : '');
const imgs = (p) => (p.imgs || []).slice(0, 4);
const vis = (p) => pic(imgs(p)[0], p.name) || esc(p.emoji || '🤠');
const tint = (p) => TINTS[p.id % 3];
const prod = (id) => S.products.find((p) => p.id === +id);

/* Normaliza fotos antes de transferirlas: conserva las fotos grandes del panel
   sin exceder la memoria por petición del runtime de Workers. El servidor vuelve
   a validar y recodificar; esta optimización no es un control de seguridad. */
async function prepareImageForm(form, campaign, maxEdge=1200) {
  const file=form.get('file');
  if(!file || typeof file==='string' || !['image/jpeg','image/png','image/webp'].includes(file.type) || typeof createImageBitmap!=='function')return form;
  if(file.size>(campaign?20:6)*1024*1024)throw new Error('El archivo supera el tamaño permitido');
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  try {
    if(bitmap.width*bitmap.height>40000000)throw new Error('La imagen supera 40 megapíxeles');
    const ratio=Math.min(1,maxEdge/bitmap.width,maxEdge/bitmap.height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se pudo preparar la imagen')),'image/webp',0.9));
    const next=new FormData();for(const [key,value] of form)next.append(key,key==='file'?new File([blob],file.name,{type:'image/webp'}):value);
    return next;
  } finally { bitmap.close(); }
}

/* API */
async function api(path, { method = 'GET', body, form, headers = {} } = {}) {
  if(body===undefined && !form && !['GET','HEAD','OPTIONS'].includes(method.toUpperCase()))body={};
  const opt = { method, credentials: 'same-origin', headers: { 'X-Requested-With': 'galope', ...headers } };
  if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  if (form) opt.body = await prepareImageForm(form,['/admin/campaign-media','/admin/banner-media'].includes(path),path==='/admin/banner-media'?1920:1200);
  let r;
  try { r = await fetch('/api' + path, opt); } catch { throw new Error('Sin conexión con el servidor'); }
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) {
    if(path==='/bold/start' && r.status===409)sessionStorage.removeItem('galope_checkout_attempt');
    const e = new Error((data && data.error) || 'Error ' + r.status);
    e.status = r.status;
    throw e;
  }
  return data;
}

/* Toast */
let tt;
function toast(m) {
  const t = $('#toast');
  t.textContent = m; t.classList.add('on');
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3000);
}

/* Modal / carrito */
let lastFocus = null;
function openPanel(el) {
  if(typeof closeMobileMenu==='function')closeMobileMenu();
  lastFocus = document.activeElement;
  ['#drawer','#modal'].forEach(s=>{const panel=$(s);panel.classList.remove('on');panel.inert=true;panel.setAttribute('aria-hidden','true');});
  $('#ov').classList.add('on');el.inert=false;el.removeAttribute('aria-hidden');el.classList.add('on');
  document.body.classList.add('panel-open');$('#app').inert=true;
  const f=el.querySelector('.x');if(f)f.focus({preventScroll:true});
}
function closeAll({keepUrl=false}={}) {
  if(!keepUrl && /^#producto-[1-9]\d*$/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);
  $('#ov').classList.remove('on');
  ['#drawer','#modal'].forEach(s=>{const el=$(s);el.classList.remove('on');el.inert=true;el.setAttribute('aria-hidden','true');});
  document.body.classList.remove('panel-open');$('#app').inert=false;
  if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;
  const panel=document.querySelector('.modal.on,.drawer.on');if(!panel)return;
  const nodes=[...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
  const first=nodes[0],last=nodes[nodes.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
});

/* Ejecuta una acción async desactivando el botón para evitar dobles envíos */
async function busy(btn, fn) {
  if (btn) btn.disabled = true;
  try { return await fn(); }
  catch (e) { toast(e.message); }
  finally { if (btn) btn.disabled = false; }
}

const goTo = (id) => { const e = document.getElementById(id); if (e) e.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); };
const openWA = (url) => window.open(url, '_blank', 'noopener');
