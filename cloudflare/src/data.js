import {HttpError} from './http.js';
export function dataHelpers(db) {
const DEFAULT_BENEFITS = [
  {id:'shipping',title:'Envíos nacionales',description:'Enviamos tus compras a diferentes destinos del país',icon:'truck',active:true},
  {id:'payments',title:'Medios de pago',description:'Consulta las opciones al finalizar tu compra',icon:'credit-card',active:true},
  {id:'returns',title:'Atención cercana',description:'Estamos aquí para ayudarte',icon:'heart-handshake',active:true},
  {id:'advice',title:'Asesoría personalizada',description:'Te ayudamos a elegir',icon:'messages-square',active:true},
  {id:'stores',title:'Tiendas físicas',description:'Conoce nuestros productos y recibe atención presencial',icon:'store',active:true},
];
const getSettings = async () => {
  const row=await db.prepare("SELECT value FROM settings WHERE key='store'").get();
  if(!row)throw new HttpError(503,'Importa tus datos o carga el catálogo inicial antes de abrir la tienda');
  const data=JSON.parse(row.value);
  return {...data, benefits: DEFAULT_BENEFITS.map((def) => {
    const prior = (data.benefits || []).find((b) => b.id === def.id) || {};
    const merged = {...def, ...prior};
    if (def.id === 'shipping' && /^(env[ií]o gratis|env[ií]os gratis)$/i.test(String(merged.title).trim())) {
      merged.title = def.title;
      if (merged.description === 'Consulta las condiciones de tu compra') merged.description = def.description;
    }
    return merged;
  })};
};
const setSettings = (obj) => db.prepare("UPDATE settings SET value=? WHERE key='store'").run(JSON.stringify(obj));

const productOut = (r) => ({
  id: r.id, name: r.name, cat: r.cat, categories: (() => { try { const a=JSON.parse(r.categories || '[]'); return Array.isArray(a)&&a.length?a:[r.cat]; } catch { return [r.cat]; } })(), world: r.world, ageMin: r.age_min, ageMax: r.age_max, price: r.price, old: r.old_price, stock: r.stock,
  badge: r.badge, emoji: r.emoji, desc: r.description,
  feats: JSON.parse(r.feats), imgs: JSON.parse(r.imgs), active: !!r.active,
});
const slideOut = (r) => ({
  id: r.id, tag: r.tag, title: r.title, sub: r.sub, off: r.off, cta: r.cta, cat: r.cat,
  bg: r.bg, img: r.img, seal: r.seal, timer: !!r.timer, active: !!r.active, customImage: r.custom_image || '', mobileImage: r.mobile_image || '', buttonUrl: r.button_url || '', mediaFit: r.media_fit || 'contain', textTheme: r.text_theme || 'claro', timerEnd: r.timer_end || '',
});

const getSidePromos = async () => JSON.parse((await db.prepare("SELECT value FROM settings WHERE key='side_promos'").get()).value);
return { db, getSettings, setSettings, getSidePromos, productOut, slideOut };

}
