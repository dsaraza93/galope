'use strict';
const fs = require('fs');
const { Database: Wasm } = require('node-sqlite3-wasm');
const cfg = require('./config');

fs.mkdirSync(cfg.uploadsDir, { recursive: true });

// SQLite en WebAssembly: no requiere compilar nada (sin Visual Studio ni node-gyp).
// Si el programa se cerró a la fuerza, puede quedar una carpeta ".lock" huérfana: la limpiamos al arrancar.
try { fs.rmSync(cfg.dbFile + '.lock', { recursive: true, force: true }); } catch { /* nada que limpiar */ }
const raw = new Wasm(cfg.dbFile);

// Pequeño adaptador con la forma: db.prepare(sql).run/get/all(...params), db.exec, db.transaction(fn)
const cache = new Map();
const num = (x) => (typeof x === 'bigint' ? Number(x) : x);
const clean = (row) => { if (row) for (const k in row) row[k] = num(row[k]); return row; };
const db = {
  exec: (sql) => raw.exec(sql),
  prepare(sql) {
    let st = cache.get(sql);
    if (!st) { st = raw.prepare(sql); cache.set(sql, st); }
    return {
      run: (...a) => { const r = st.run(a); return { changes: num(r.changes), lastInsertRowid: num(r.lastInsertRowid) }; },
      get: (...a) => clean(st.get(a)) || undefined,
      all: (...a) => st.all(a).map(clean),
    };
  },
  transaction: (fn) => (...args) => {
    raw.exec('BEGIN IMMEDIATE');
    try { const r = fn(...args); raw.exec('COMMIT'); return r; }
    catch (e) { try { raw.exec('ROLLBACK'); } catch { /* ya revertido */ } throw e; }
  },
};
raw.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  cat         TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  old_price   INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge       TEXT NOT NULL DEFAULT '',
  emoji       TEXT NOT NULL DEFAULT '🍼',
  description TEXT NOT NULL DEFAULT '',
  feats       TEXT NOT NULL DEFAULT '[]',
  imgs        TEXT NOT NULL DEFAULT '[]',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  name          TEXT NOT NULL,
  tel           TEXT NOT NULL,
  addr          TEXT NOT NULL,
  pay_id        TEXT NOT NULL,
  pay_name      TEXT NOT NULL,
  subtotal      INTEGER NOT NULL,
  free_shipping INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Nuevo'
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0)
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS slides (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  pos    INTEGER NOT NULL,
  tag    TEXT NOT NULL DEFAULT '',
  title  TEXT NOT NULL DEFAULT '',
  sub    TEXT NOT NULL DEFAULT '',
  off    TEXT NOT NULL DEFAULT '',
  cta    TEXT NOT NULL DEFAULT '',
  cat    TEXT NOT NULL DEFAULT '',
  bg     TEXT NOT NULL DEFAULT 'blush',
  img    TEXT NOT NULL DEFAULT '',
  seal   TEXT NOT NULL DEFAULT '',
  timer  INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscribers (
  tel        TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL
);
`);

// Migración: pedidos antiguos mantienen su inventario como estaba (sin doble descuento).
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
if (!orderCols.includes('reservation_state')) db.exec("ALTER TABLE orders ADD COLUMN reservation_state TEXT NOT NULL DEFAULT 'committed'");
if (!orderCols.includes('reserved_until')) db.exec("ALTER TABLE orders ADD COLUMN reserved_until TEXT NOT NULL DEFAULT ''");
db.exec("CREATE INDEX IF NOT EXISTS idx_order_reservation ON orders(reservation_state,status,reserved_until)");
// Fecha de entrega: solo se cuenta como venta realizada cuando se entrega.
if (!orderCols.includes('delivered_at')) db.exec("ALTER TABLE orders ADD COLUMN delivered_at TEXT NOT NULL DEFAULT ''");
// Pedidos antiguos entregados: fecha original como aproximación histórica explícita.
db.exec("UPDATE orders SET delivered_at=created_at WHERE status='Entregado' AND delivered_at=''");
db.exec("CREATE INDEX IF NOT EXISTS idx_orders_delivered ON orders(status,delivered_at)");


// Banner editable con foto propia: migración aditiva y compatible.
const slideColumns = db.prepare('PRAGMA table_info(slides)').all().map(x => x.name);
if (!slideColumns.includes('mobile_image')) db.exec("ALTER TABLE slides ADD COLUMN mobile_image TEXT NOT NULL DEFAULT ''");
if (!slideColumns.includes('button_url')) db.exec("ALTER TABLE slides ADD COLUMN button_url TEXT NOT NULL DEFAULT ''");
if (!slideColumns.includes('media_fit')) db.exec("ALTER TABLE slides ADD COLUMN media_fit TEXT NOT NULL DEFAULT 'contain'");
if (!slideColumns.includes('custom_image')) db.exec("ALTER TABLE slides ADD COLUMN custom_image TEXT NOT NULL DEFAULT ''");
if (!slideColumns.includes('text_theme')) {
  db.exec("ALTER TABLE slides ADD COLUMN text_theme TEXT NOT NULL DEFAULT 'claro'");
  db.exec("UPDATE slides SET text_theme='oscuro' WHERE bg<>'photo'");
}
if (!slideColumns.includes('timer_end')) db.exec("ALTER TABLE slides ADD COLUMN timer_end TEXT NOT NULL DEFAULT ''");

// Migración compatible: no elimina ni modifica productos, fotos o pedidos existentes.
const existingProductColumns = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
if (!existingProductColumns.includes('world')) db.exec("ALTER TABLE products ADD COLUMN world TEXT NOT NULL DEFAULT 'hombre'");
if (!existingProductColumns.includes('age_min')) db.exec("ALTER TABLE products ADD COLUMN age_min INTEGER NOT NULL DEFAULT 0");
if (!existingProductColumns.includes('age_max')) db.exec("ALTER TABLE products ADD COLUMN age_max INTEGER NOT NULL DEFAULT 36");
if (!existingProductColumns.includes('categories')) db.exec("ALTER TABLE products ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'");
// Migración aditiva: las categorías existentes quedan preservadas sin duplicar productos.
db.prepare("UPDATE products SET categories=json_array(cat) WHERE categories='[]'").run();
// Distinguir artículos de Juegos preexistentes sin sobrescribir clasificaciones futuras.
if (!existingProductColumns.includes('world')) {
  db.prepare("UPDATE products SET world='mujer', age_min=36, age_max=144 WHERE lower(cat) IN ('juguetes', 'juguetería', 'juegos educativos', 'vehículos', 'muñecos')").run();
}

/* Club Galope: migración aditiva, sin consentimiento implícito para contactos anteriores. */
const subCols = db.prepare('PRAGMA table_info(subscribers)').all().map(c => c.name);
for (const [name, def] of Object.entries({
  interest: "TEXT NOT NULL DEFAULT 'ambos'",
  consent: 'INTEGER NOT NULL DEFAULT 0',
  consent_at: 'TEXT',
  consent_source: "TEXT NOT NULL DEFAULT 'legacy'",
  status: "TEXT NOT NULL DEFAULT 'pending'",
  updated_at: 'TEXT',
  name: "TEXT NOT NULL DEFAULT ''",
})) if (!subCols.includes(name)) db.exec(`ALTER TABLE subscribers ADD COLUMN ${name} ${def}`);
// Registro de membresías confirmadas en WhatsApp; no implica sincronización automática.
db.exec(`CREATE TABLE IF NOT EXISTS broadcast_members (
  tel TEXT NOT NULL, world TEXT NOT NULL CHECK(world IN ('hombre','mujer')),
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(tel, world)
)`);
db.exec(`CREATE TABLE IF NOT EXISTS broadcast_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  world TEXT NOT NULL, operation TEXT NOT NULL,
  contacts_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
)`);
db.exec(`CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'todos',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  media_url TEXT NOT NULL DEFAULT '',
  media_kind TEXT NOT NULL DEFAULT '',
  media_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`);
const campCols = db.prepare('PRAGMA table_info(campaigns)').all().map(c => c.name);
for (const [name, def] of Object.entries({
  media_url: "TEXT NOT NULL DEFAULT ''",
  media_kind: "TEXT NOT NULL DEFAULT ''",
  media_name: "TEXT NOT NULL DEFAULT ''",
})) if (!campCols.includes(name)) db.exec(`ALTER TABLE campaigns ADD COLUMN ${name} ${def}`);

/* ---------- Datos de ejemplo (solo la primera vez) ---------- */
const FE = [
  ['Algodón suave y respirable', 'Cuello con volante delicado', 'Cierre de broches para cambiar fácil', 'Lavable a máquina'],
  ['Plato, vaso, cubiertos y babero', 'Silicona suave y flexible', 'Base antideslizante', 'Fácil de lavar'],
  ['Se pliega para guardarla fácil', 'Fondo antideslizante', 'Tapón de drenaje', 'Ligera y resistente'],
  ['Capota extensible', 'Suspensión en las 4 ruedas', 'Plegado compacto', 'Cinturón de seguridad de 5 puntos'],
  ['Altura regulable', 'Malla transpirable lateral', 'Se acopla a la cama', 'Incluye colchón'],
  ['Arco con juguetes colgantes', 'Teclado de piano con sonidos', 'Tapete lavable', 'Estimula tacto y vista'],
];

function seed() {
  // Each new installation receives only Galope demonstration products, never customer data.
  const sql = require('fs').readFileSync(require('path').join(__dirname, '..', 'cloudflare', 'scripts', 'demo.sql'), 'utf8');
  if (!db.prepare("SELECT 1 FROM settings WHERE key='store'").get()) db.exec(sql);
}
seed();
// Las dos tarjetas laterales del hero conservan su contenido original al migrar.
const defaultSidePromos = [
  {eyebrow:'Envío gratis',title:'En compras desde $150.000',cta:'Comprar ahora',category:'',theme:'morado',active:true},
  {eyebrow:'Nuevos ingresos',title:'Lo último para su llegada',cta:'Descubrir',category:'',theme:'crema',active:true},
];
if (!db.prepare("SELECT 1 FROM settings WHERE key='side_promos'").get()) {
  db.prepare('INSERT INTO settings(key,value) VALUES (?,?)').run('side_promos',JSON.stringify(defaultSidePromos));
}

/* ---------- Helpers ---------- */
const DEFAULT_BENEFITS = [
  {id:'shipping',title:'Envíos nacionales',description:'Enviamos tus compras a diferentes destinos del país',icon:'truck',active:true},
  {id:'payments',title:'Medios de pago',description:'Consulta las opciones al finalizar tu compra',icon:'credit-card',active:true},
  {id:'returns',title:'Atención cercana',description:'Estamos aquí para ayudarte',icon:'heart-handshake',active:true},
  {id:'advice',title:'Asesoría personalizada',description:'Te ayudamos a elegir',icon:'messages-square',active:true},
  {id:'stores',title:'Tiendas físicas',description:'Conoce nuestros productos y recibe atención presencial',icon:'store',active:true},
];
const getSettings = () => {
  const data = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='store'").get().value);
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

const getSidePromos = () => JSON.parse(db.prepare("SELECT value FROM settings WHERE key='side_promos'").get().value);
module.exports = { db, getSettings, setSettings, getSidePromos, productOut, slideOut };
