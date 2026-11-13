'use strict';
/* Eventos globales (delegados, sin handlers inline para poder usar CSP estricta) y rutas */
function closeMobileMenu(restoreFocus = false) {
  const header=document.querySelector('.store-header'),button=header?.querySelector('.mobile-menu-toggle');
  if(!header)return;
  const wasOpen=header.classList.contains('menu-open');
  header.classList.remove('menu-open');document.body.classList.remove('mobile-menu-open');
  button?.setAttribute('aria-expanded','false');button?.setAttribute('aria-label','Abrir menú');
  header.querySelectorAll('.nav-group').forEach(g=>g.open=false);
  if(restoreFocus&&wasOpen)button?.focus({preventScroll:true});
}
function toggleMobileMenu() {
  const header=document.querySelector('.store-header'),button=header?.querySelector('.mobile-menu-toggle');
  if(!header)return;
  if(header.classList.contains('menu-open'))return closeMobileMenu(true);
  hideSearchResults();header.classList.add('menu-open');document.body.classList.add('mobile-menu-open');
  button?.setAttribute('aria-expanded','true');button?.setAttribute('aria-label','Cerrar menú');
  header.querySelector('.nav a')?.focus({preventScroll:true});
}
const A = {
  admin: () => openAdminRoute(),
  offers: () => { offersOnly = true; world = ''; cat = ''; q = ''; favOnly = false; const input = document.querySelector('#q'); if(input)input.value = ''; renderGrid(); goTo('prods'); },
  verifypayment: () => { void checkBoldReturn({quiet:false,restart:true}); },
  mobilemenu: () => toggleMobileMenu(),
  closemenu: () => closeMobileMenu(true),
  browse: () => { closeMobileMenu(); goTo('prods'); },
  focussearch: () => { closeMobileMenu();document.querySelector('#q')?.focus({preventScroll:true}); },
  scroll: (a) => goTo(a),
  home: () => { offersOnly = false; world = ''; cat = ''; ageRange = ''; toysOnly = false; stimOnly = false; favOnly = false; q = ''; const input = document.querySelector('#q'); if (input) input.value = ''; hideSearchResults(); renderGrid(); window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); },
  worldcat: (a) => { const [w, ...parts] = a.split('|'); world = w; cat = parts.join('|'); toysOnly = false; stimOnly = false; ageRange = ''; favOnly = false; q = ''; const input = document.querySelector('#q'); if (input) input.value = ''; hideSearchResults(); renderGrid(); goTo('prods'); },
  stim: () => { stimOnly = true; toysOnly = false; offersOnly = false; world = ''; cat = ''; ageRange = ''; favOnly = false; q = ''; const input = document.querySelector('#q'); if (input) input.value = ''; hideSearchResults(); renderGrid(); goTo('prods'); },
  toys: () => { toysOnly = true; offersOnly = false; world = ''; cat = ''; ageRange = ''; favOnly = false; q = ''; const input = document.querySelector('#q'); if (input) input.value = ''; hideSearchResults(); renderGrid(); goTo('prods'); },
  searchall: () => { hideSearchResults(); goTo('prods'); },
  wa: () => waGeneral(),
  go: (a) => { offersOnly = false; world = ''; ageRange = ''; toysOnly = false; stimOnly = false; cat = a; favOnly = false; renderGrid(); goTo('prods'); },
  world: (a) => { offersOnly = false; world = a; toysOnly = false; stimOnly = false; ageRange = ''; cat = ''; q = ''; favOnly = false; const input = document.querySelector('#q'); if (input) input.value = ''; hideSearchResults(); renderGrid(); goTo('prods'); },
  chip: (a) => { cat = a; stimOnly = false; toysOnly = false; stimOnly = false; favOnly = false; if (!a) offersOnly = false; world = ''; renderGrid(); },
  favs: () => { favOnly = !favOnly; toysOnly = false; stimOnly = false; offersOnly = false; world = ''; ageRange = ''; cat = ''; renderGrid(); toast(favOnly ? 'Mostrando tus favoritos' : 'Mostrando todo'); goTo('prods'); },
  fav: (a) => { const id = +a, i = favs.indexOf(id); i < 0 ? favs.push(id) : favs.splice(i, 1); lsSet('galope_fav', favs); renderGrid(); upd(); },
  add: (a) => add(+a),
  view: (a) => view(+a),
  copyproduct: (a) => copyProductLink(+a),
  cart: () => drawer(),
  close: () => closeAll(),
  salesquick: (a) => { salesPeriod=a; salesOffset=0; renderTab().catch(e=>toast(e.message)); },
  salescurrent: () => { salesOffset=0; renderTab().catch(e=>toast(e.message)); },
  salesprev: () => { salesOffset--; renderTab().catch(e=>toast(e.message)); },
  salesnext: () => { salesOffset++; renderTab().catch(e=>toast(e.message)); },
  customerperiod: (a) => { customerPeriod=a; customerOffset=0; renderTab().catch(e=>toast(e.message)); },
  customerprev: () => { customerOffset--; renderTab().catch(e=>toast(e.message)); },
  customercurrent: () => { customerOffset=0; renderTab().catch(e=>toast(e.message)); },
  customernext: () => { customerOffset++; renderTab().catch(e=>toast(e.message)); },
  bannerpause: () => { manualPause=!manualPause; const b=document.querySelector('.banner-pause'); b?.setAttribute('aria-pressed',String(manualPause));b?.setAttribute('aria-label',manualPause?'Reanudar carrusel':'Pausar carrusel');if(b)b.textContent=manualPause?'>':'II';if(manualPause)clearTimeout(tm);else slide(si); },
  prev: () => slide(si - 1),
  next: () => slide(si + 1),
  slide: (a) => slide(+a),
  setimg: (a) => { const [id, i] = a.split(':'); setImg(+id, +i); },
  vqc: (a) => { const [k, id] = a.split(':'); vqc(+k, +id); },
  addview: (a) => { add(+a, vq); closeAll(); },
  buynow: (a) => { add(+a, vq); closeAll(); drawer(); },
  qty: (a) => { const [id, k] = a.split(':'); qty(+id, +k); },
  /* admin */
  tab: (a) => { tab = a; renderTab().catch((e) => toast(e.message)); },
  refreshpayments: () => refreshBoldAdminPayments(),
  verifyboldpayment: (id) => verifyBoldAdminPayment(id),
  pedit: (a) => pedit(a),
  pdel: (a) => pdel(a),
  imgmain: (a) => { imgsD.unshift(imgsD.splice(+a, 1)[0]); gp(); },
  imgdel: (a) => { imgsD.splice(+a, 1); gp(); },
  sdel: (a) => sdel(a),
  cdel: (a) => cdel(a),
  bdraft: (a) => bdraft(a),
  bconfirm: (a) => bconfirm(a),
  suboff: (a) => suboff(a),
  campmediaremove: () => removeCampaignMedia(),
  bannerreset: (a) => resetBannerImage(document.activeElement),
  bannermobilereset: () => {const f=document.activeElement.closest('form');f.elements.mobileImage.value='';f.querySelector('.banner-mobile-preview').textContent='Se usará el archivo de escritorio';},
  logout: () => doLogout(),
};
document.addEventListener('click', (e) => {
  const link=e.target.closest('a[href]');
  if(link && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button!==0))return;
  if(link && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button===0) {
    const url=new URL(link.href,location.href);
    if(url.origin===location.origin && url.pathname===location.pathname && /^#producto-[1-9]\d*$/.test(url.hash)) {
      e.preventDefault();history.pushState(null,'',url.hash);openProductHash();return;
    }
  }
  if (e.target.id === 'ov') return closeAll();
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const fn = A[t.dataset.act];
  if (!fn) return;
  if (t.tagName === 'A') e.preventDefault();
  if(!['mobilemenu','closemenu'].includes(t.dataset.act))closeMobileMenu();
  const task=fn(t.dataset.arg ?? '');
  if(task?.catch)task.catch(e=>toast(e.message));
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  const btn = f.querySelector('button:not([type=button])');
  ({ order: submitOrder, subscribe: submitSubscribe, campaign: saveCampaign, product: saveProduct, slide: saveSlide, sidepromo: saveSidePromo, settings: saveSettings })[f.dataset.form](f, btn);
});
document.addEventListener('change', (e) => {
  const t = e.target.closest('[data-chg]');
  if (!t) return;
  if (t.dataset.chg?.startsWith('sales')) { const k=t.dataset.chg; if(k==='salesperiod'){salesPeriod=t.value;salesOffset=0;} if(k==='salesmonth')salesMonth=t.value;if(k==='salesfrom')salesFrom=t.value;if(k==='salesto')salesTo=t.value;renderTab().catch(e=>toast(e.message));return; }
  if (t.dataset.chg === 'subfilter') filterSubscribers();
  if (t.dataset.chg === 'status') setStatus(t);
  if (t.dataset.chg === 'age') { ageRange = t.value; renderGrid(); }
  if (t.dataset.chg === 'audience') { offersOnly = false; world = t.value; cat = ''; favOnly = false; renderGrid(); }
  if (t.dataset.chg === 'catalogcat') { offersOnly = false; cat = t.value; favOnly = false; renderGrid(); }
  if (t.dataset.chg === 'pick') pickFiles(t);
  if (t.dataset.chg === 'bannerproduct' && t.value) t.closest('form').elements.buttonUrl.value=new URL(t.value,location.origin+location.pathname).href;
  if (t.dataset.chg === 'bannerfile') uploadBannerImage(t);
  if (t.dataset.chg === 'bannerfit') t.closest('form').querySelectorAll('.banner-media-preview .banner-media,.banner-mobile-preview .banner-media').forEach(media=>media.className='banner-media fit-'+t.value);
  if (t.dataset.chg === 'bannertheme') { const snap=t.closest('form')?.querySelector('.banner-editor-copy'); if(snap){snap.classList.toggle('preview-dark',t.value==='oscuro');snap.classList.toggle('preview-light',t.value!=='oscuro');} }
  if (t.dataset.chg === 'campfile') pickCampaignMedia(t);
  if (t.dataset.chg === 'ostatus') setStatus(t);
  if (t.dataset.chg === 'ofilter') { ordFilter = t.value; renderTab().catch((x) => toast(x.message)); }
});
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeAll());

let routeRun=0;
async function openAdminRoute() {
  closeAll({keepUrl:true});closeMobileMenu();
  if(location.hash!=='#admin')history.pushState({galopeAdmin:true},'','#admin');
  await route();scrollTo(0,0);
}
async function route() {
  const run=++routeRun,isAdmin=location.hash==='#admin';
  document.body.classList.toggle('store-page',!isAdmin);
  document.body.classList.remove('mobile-menu-open');
  if(isAdmin){
    $('#app').innerHTML='<div class="boot" role="status">Abriendo administración de Galope…</div>';
    if(!S.categories.length)await loadStore().catch(()=>{});
    if(run!==routeRun || location.hash!=='#admin')return;
    return admin();
  }
  try {
    await loadStore();if(run!==routeRun || location.hash==='#admin')return;
    renderStore();void checkBoldReturn({quiet:true});
  } catch(e) {
    if(run!==routeRun)return;
    $('#app').innerHTML=`<div class="boot">No pudimos cargar la tienda. ${esc(e.message)} <br><button class="btn" data-act="reload" style="margin-top:14px">Reintentar</button></div>`;
  }
}
A.reload = () => route();
addEventListener('hashchange', () => { closeAll({keepUrl:true}); if(location.hash!=='#admin' && document.querySelector('#grid')){openProductHash();return;} route(); scrollTo(0, 0); });
route();

document.addEventListener('input',(e)=>{if(e.target.id==='sub-search')filterSubscribers();});

document.addEventListener('input',e=>{const key=e.target.dataset.bannerPreview;if(!key)return;const box=e.target.closest('form');const target=box?.querySelector('[data-preview-'+key+']');if(target)target.textContent=e.target.value;});

addEventListener('resize',()=>{if(innerWidth>820)closeMobileMenu();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeMobileMenu(true);
  if(e.key==='Tab'&&document.body.classList.contains('mobile-menu-open')){
    const header=document.querySelector('.store-header');
    const links=[...header.querySelectorAll('button:not([disabled]),a,summary,input')].filter(el=>el.getClientRects().length);
    const first=links[0],last=links[links.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
});
