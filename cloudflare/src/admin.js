import {bannerOptions} from './banner-options.js';
import {Router} from './router.js';
import {HttpError,v} from './http.js';
export function adminRouter(ctx) {
const {db,cfg,getSettings,setSettings,getSidePromos,productOut,slideOut,expireReservations,verifyBoldPayment,uploads,whatsAppProvider}=ctx;
const {upload,mediaUpload,saveImage,saveCampaignMedia,isOurImage,isOurCampaignMedia,cleanupOrphans,cleanupCampaignMedia}=uploads;
const router=new Router();
const CAT_NAMES = cfg.categories.map(c => c[0]);
const BG = ['photo', 'blush', 'mist', 'lilac', 'champagne'];
const IMG_KEYS = ['', ...cfg.categories.map(c => c[1])];

/* ---------- Resumen comercial: exclusivamente pagos Bold confirmados ---------- */
router.get('/summary', async (req, res) => {
  const {
    from,
    to
  } = req.query;
  const valid = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  if (!valid(from) || !valid(to) || from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 370) {
    throw new HttpError(400, 'Selecciona un rango válido de máximo 371 días');
  }
  res.set('Cache-Control', 'no-store');
  const paid = await db.prepare(`SELECT id, name, document_type, document_number, tel,
    created_at, total, fulfillment, items_json
    FROM bold_checkout_orders WHERE status='PAID'
    AND substr(created_at,1,10) BETWEEN ? AND ? ORDER BY created_at DESC, rowid DESC`).all(from, to);
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota'
  });
  const todayRow = await db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS amount
    FROM bold_checkout_orders WHERE status='PAID' AND substr(created_at,1,10)=?`).get(today);
  const stats = await db.prepare(`SELECT status, COUNT(*) AS n FROM bold_checkout_orders
    WHERE substr(created_at,1,10) BETWEEN ? AND ? GROUP BY status`).all(from, to);
  const statuses = Object.fromEntries(stats.map(x => [x.status, x.n]));
  const days = new Map(),
    products = new Map(),
    customers = new Set();
  const fulfillment = {
    delivery: 0,
    pickup: 0
  };
  let units = 0,
    revenue = 0;
  for (const p of paid) {
    const day = p.created_at.slice(0, 10),
      entry = (await days.get(day)) || {
        day,
        amount: 0,
        orders: 0
      };
    entry.amount += p.total;
    entry.orders++;
    days.set(day, entry);
    revenue += p.total;
    const doc = String(p.document_number || '').trim();
    const tel = String(p.tel || '').replace(/\D/g, '');
    if (doc) customers.add('d:' + p.document_type + ':' + doc);else if (tel) customers.add('t:' + tel);
    if (p.fulfillment === 'pickup') fulfillment.pickup++;else fulfillment.delivery++;
    let items = [];
    try {
      items = JSON.parse(p.items_json || '[]');
    } catch (_e) {}
    for (const it of items) {
      const q = Number(it.q),
        price = Number(it.price);
      if (!Number.isSafeInteger(q) || q <= 0) continue;
      units += q;
      const key = String(it.id || it.name || 'Sin nombre');
      const cur = (await products.get(key)) || {
        name: String(it.name || 'Producto'),
        units: 0,
        revenue: 0
      };
      cur.units += q;
      cur.revenue += (Number.isFinite(price) ? price : 0) * q;
      products.set(key, cur);
    }
  }
  const inventory = await db.prepare(`SELECT COUNT(*) AS active,
    SUM(CASE WHEN stock<=3 THEN 1 ELSE 0 END) AS low,
    SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) AS out
    FROM products WHERE active=1`).get();
  res.json({
    range: {
      from,
      to
    },
    todaySales: todayRow.amount,
    todayOrders: todayRow.n,
    sales: revenue,
    soldOrders: paid.length,
    units,
    average: paid.length ? Math.round(revenue / paid.length) : 0,
    customers: customers.size,
    approved: paid.length,
    rejected: (statuses.REJECTED || 0) + (statuses.FAILED || 0),
    pending: (statuses.PENDING || 0)+(statuses.VERIFYING || 0)+(statuses.EXPIRED || 0),
    delivery: fulfillment.delivery,
    pickup: fulfillment.pickup,
    activeProducts: inventory.active || 0,
    lowStock: inventory.low || 0,
    outOfStock: inventory.out || 0,
    trend: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    topProducts: [...products.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 8)
  });
});

/* ---------- Pagos de Bold (solo administradores autenticados) ---------- */

router.get('/bold-payments', async (_req, res) => {
  const rows = await db.prepare(`SELECT id,created_at,status,name,tel,document_type,document_number,address,fulfillment,items_json,
      subtotal,shipping,total,payment_id,payment_status,stock_held,reservation_alert,verification_error,last_verified_at,checkout_currency,verified_currency_source,rejection_confirmed,stock_released_at
      FROM bold_checkout_orders ORDER BY created_at DESC, rowid DESC LIMIT 200`).all();
  res.json(rows.map(r => ({
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    name: r.name,
    tel: r.tel,
    documentType: r.document_type,
    documentNumber: r.document_number,
    address: r.address,
    fulfillment: r.fulfillment,
    subtotal: r.subtotal,
    shipping: r.shipping,
    total: r.total,
    rejectionConfirmed:!!r.rejection_confirmed,stockReleasedAt:r.stock_released_at,
    checkoutCurrency:r.checkout_currency,verifiedCurrencySource:r.verified_currency_source,
    stockHeld: !!r.stock_held, reservationAlert:r.reservation_alert, verificationError:r.verification_error,lastVerifiedAt:r.last_verified_at,
    paymentId: r.payment_id,
    paymentStatus: r.payment_status,
    items: JSON.parse(r.items_json || '[]').map(i => ({
      name: i.name,
      q: i.q,
      price: i.price
    }))
  })));
});
/* Analítica de clientes: únicamente compras Bold aprobadas. Acceso protegido por requireAdmin. */
async function customerReport(req) {
  const {
    from,
    to
  } = req.query;
  const valid = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
  if (!valid(from) || !valid(to) || from > to) throw new HttpError(400, 'Período no válido');
  const rows = await db.prepare(`SELECT id,name,tel,document_type,document_number,total,created_at,items_json
    FROM bold_checkout_orders WHERE status='PAID' AND substr(created_at,1,10) BETWEEN ? AND ?
    ORDER BY created_at DESC,rowid DESC`).all(from, to);
  const byCustomer = new Map();
  for (const r of rows) {
    const document = String(r.document_number || '').trim().toUpperCase();
    const phone = String(r.tel || '').replace(/\D/g, '');
    const key = document ? 'doc:' + String(r.document_type || '').toUpperCase() + ':' + document : 'tel:' + phone;
    if (!document && !phone) continue;
    if (!byCustomer.has(key)) byCustomer.set(key, {
      name: r.name,
      tel: r.tel,
      documentType: r.document_type || '',
      documentNumber: r.document_number || '',
      purchases: 0,
      spent: 0,
      products: new Map(),
      orders: [],
      lastPurchase: r.created_at
    });
    const c = await byCustomer.get(key);
    c.purchases++;
    c.spent += Number(r.total || 0);
    let items = [];
    try {
      items = JSON.parse(r.items_json || '[]');
    } catch (_e) {
      items = [];
    }
    const orderProducts = [];
    for (const i of items) {
      const name = String(i.name || 'Producto sin nombre');
      const q = Number(i.q || 0);
      if (!Number.isSafeInteger(q) || q <= 0) continue;
      const productKey = String(i.id || '') + '|' + name;
      if (!c.products.has(productKey)) c.products.set(productKey, {
        name,
        quantity: 0
      });
      (await c.products.get(productKey)).quantity += q;
      orderProducts.push({
        name,
        quantity: q
      });
    }
    c.orders.push({
      id: r.id,
      total: r.total,
      date: r.created_at,
      products: orderProducts
    });
  }
  const customers = Array.from(byCustomer.values()).map(c => ({
    ...c,
    products: Array.from(c.products.values()).sort((x, y) => y.quantity - x.quantity)
  })).sort((a, b) => b.purchases - a.purchases || b.spent - a.spent);
  return {
    from,
    to,
    customers,
    repeat: customers.filter(c => c.purchases >= 2).length,
    purchases: customers.reduce((n, c) => n + c.purchases, 0),
    revenue: customers.reduce((n, c) => n + c.spent, 0)
  };
}
router.get('/customers', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await customerReport(req));
});
router.get('/customers.csv', async (req, res) => {
  const data = await customerReport(req);
  const filter = String(req.query.segment || 'all');
  if (!['all', 'repeat', 'single'].includes(filter)) throw new HttpError(400, 'Segmento inválido');
  const selected = data.customers.filter(c => filter === 'repeat' ? c.purchases >= 2 : filter === 'single' ? c.purchases === 1 : true);
  const clean = v => {
    let t = String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim();
    if (/^[=+@-]/.test(t)) t = "'" + t; // prevenir fórmulas al abrir el CSV
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const rows = [['Nombre', 'Teléfono', 'Tipo documento', 'Documento', 'Compras aprobadas', 'Total gastado COP', 'Última compra', 'Productos comprados', 'Fecha desde', 'Fecha hasta']];
  for (const c of selected) rows.push([c.name, c.tel, c.documentType, c.documentNumber, c.purchases, c.spent, c.lastPurchase, c.products.map(p => p.quantity + ' x ' + p.name).join(' | '), data.from, data.to]);
  res.set('Cache-Control', 'no-store');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="galope-clientes-${data.from}-a-${data.to}.csv"`);
  res.send('\uFEFF' + rows.map(row => row.map(clean).join(';')).join('\r\n'));
});
router.post('/bold-payments/:id/verify', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^BC-[A-F0-9]{20}$/.test(id)) throw new HttpError(400, 'Referencia de pago inválida');
  const row = await db.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Pago no encontrado');
  if (['PENDING','VERIFYING','EXPIRED','REJECTED'].includes(row.status)) await verifyBoldPayment(row);
  const current = await db.prepare('SELECT id,status,payment_status,rejection_confirmed,stock_held FROM bold_checkout_orders WHERE id=?').get(id);
  res.json({
    id: current.id,
    status: current.status,
    paymentStatus: current.payment_status || 'PROCESSING',
    rejectionConfirmed:current.status==='REJECTED'&&!!current.rejection_confirmed,stockReleased:current.status==='REJECTED'&&!!current.rejection_confirmed&&!current.stock_held
  });
});

/* ---------- Productos ---------- */
function readProduct(b) {
  b = b || {};
  const price = v.int(b.price, 'Precio', {
    min: 0,
    max: 100_000_000
  });
  const old = b.old === '' || b.old == null ? 0 : v.int(b.old, 'Precio anterior', {
    min: 0,
    max: 100_000_000
  });
  const imgs = Array.isArray(b.imgs) ? b.imgs : [];
  if (imgs.length > 4) throw new HttpError(400, 'Máximo 4 fotos');
  if (!imgs.every(isOurImage)) throw new HttpError(400, 'Foto no válida (súbela desde el panel)');
  const feats = (Array.isArray(b.feats) ? b.feats : []).slice(0, 12).map(f => v.str(f, 'Característica', {
    max: 120
  })).filter(Boolean);
  const minAge = v.int(b.ageMin ?? 0, 'Edad mínima', {
    min: 0,
    max: 216
  });
  const maxAge = v.int(b.ageMax ?? 36, 'Edad máxima', {
    min: 0,
    max: 216
  });
  if (maxAge < minAge) throw new HttpError(400, 'La edad máxima no puede ser menor a la mínima');
  return {
    name: v.str(b.name, 'Nombre', {
      min: 2,
      max: 120
    }),
    categories: (() => {
      const cats = Array.isArray(b.categories) ? [...new Set(b.categories)] : [b.cat];
      if (!cats.length || !cats.every(c => CAT_NAMES.includes(c))) throw new HttpError(400, 'Selecciona al menos una categoría válida');
      return cats;
    })(),
    cat: v.oneOf(Array.isArray(b.categories) && b.categories[0] || b.cat, CAT_NAMES, 'Categoría'),
    world: v.oneOf(b.world || 'hombre', ['hombre', 'mujer', 'unisex'], 'Público'),
    ageMin: minAge,
    ageMax: maxAge,
    price,
    old,
    stock: v.int(b.stock, 'Stock', {
      min: 0,
      max: 100_000
    }),
    badge: v.str(b.badge, 'Etiqueta', {
      max: 24,
      required: false
    }),
    emoji: v.str(b.emoji, 'Emoji', {
      max: 8,
      required: false
    }) || '🍼',
    desc: v.str(b.desc, 'Descripción', {
      max: 1000,
      oneLine: false,
      required: false
    }),
    feats,
    imgs,
    active: v.bool(b.active) ? 1 : 0
  };
}
router.get('/products', async (req, res) => {
  res.json((await db.prepare('SELECT * FROM products ORDER BY id DESC').all()).map(productOut));
});
router.post('/products', async (req, res) => {
  const p = readProduct(req.body);
  const r = await db.prepare(`INSERT INTO products(name,cat,categories,world,age_min,age_max,price,old_price,stock,badge,emoji,description,feats,imgs,active)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.name, p.cat, JSON.stringify(p.categories), p.world, p.ageMin, p.ageMax, p.price, p.old, p.stock, p.badge, p.emoji, p.desc, JSON.stringify(p.feats), JSON.stringify(p.imgs), p.active);
  res.status(201).json(productOut(await db.prepare('SELECT * FROM products WHERE id=?').get(r.lastInsertRowid)));
});
router.put('/products/:id', async (req, res) => {
  const id = v.int(Number(req.params.id), 'ID', {
    min: 1
  });
  const cur = await db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (!cur) throw new HttpError(404, 'Producto no encontrado');
  const p = readProduct(req.body);
  await db.prepare(`UPDATE products SET name=?,cat=?,categories=?,world=?,age_min=?,age_max=?,price=?,old_price=?,stock=?,badge=?,emoji=?,description=?,feats=?,imgs=?,active=?,
              updated_at=datetime('now') WHERE id=?`).run(p.name, p.cat, JSON.stringify(p.categories), p.world, p.ageMin, p.ageMax, p.price, p.old, p.stock, p.badge, p.emoji, p.desc, JSON.stringify(p.feats), JSON.stringify(p.imgs), p.active, id);
  await cleanupOrphans(JSON.parse(cur.imgs));
  res.json(productOut(await db.prepare('SELECT * FROM products WHERE id=?').get(id)));
});
router.delete('/products/:id', async (req, res) => {
  const id = v.int(Number(req.params.id), 'ID', {
    min: 1
  });
  const cur = await db.prepare('SELECT imgs FROM products WHERE id=?').get(id);
  if (!cur) throw new HttpError(404, 'Producto no encontrado');
  await expireReservations();
  const pending = (await db.prepare("SELECT COUNT(*) n FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.product_id=? AND o.reservation_state='reserved'").get(id)).n;
  if (pending) throw new HttpError(409, 'Este producto tiene pedidos reservados. Cancélalos o confírmalos antes de eliminarlo.');
  await db.prepare('DELETE FROM products WHERE id=?').run(id);
  await cleanupOrphans(JSON.parse(cur.imgs));
  res.json({
    ok: true
  });
});
router.post('/uploads', upload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No llegó ninguna imagen');
  res.status(201).json({
    url: await saveImage(req.file.buffer)
  });
});
router.post('/banner-media', mediaUpload.single('file'), async (req, res) => {
  if (/\.mov$/i.test(req.file?.originalname || '')) throw new HttpError(400, 'Usa un video MP4 o WebM');
  if (!req.file) throw new HttpError(400, 'No llegó ningún archivo');
  const saved = await saveCampaignMedia(req.file.buffer, req.file.originalname,1920);
  if (saved.kind === 'video' && !/\.(mp4|webm)$/.test(saved.url)) throw new HttpError(400, 'Usa un video MP4 o WebM');
  res.status(201).json(saved);
});

router.post('/campaign-media', mediaUpload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No llegó ningún archivo');
  const saved = await saveCampaignMedia(req.file.buffer, req.file.originalname);
  res.status(201).json({
    ...saved,
    originalName: String(req.file.originalname || '').slice(0, 120)
  });
});

/* ---------- Pedidos ---------- */
const ordersWithItems = async rows => await Promise.all(rows.map(async o => ({
  id: o.id,
  date: o.created_at.replace(' ', 'T') + 'Z',
  name: o.name,
  tel: o.tel,
  addr: o.addr,
  pay: o.pay_name,
  total: o.total,
  freeShipping: !!o.free_shipping,
  status: o.status,
  reservationState: o.reservation_state,
  reservedUntil: o.reserved_until,
  items: await db.prepare('SELECT name,price,qty FROM order_items WHERE order_id=?').all(o.id)
})));
router.get('/orders', async (req, res) => {
  await expireReservations();
  const st = req.query.status;
  const rows = st && cfg.orderStatuses.includes(st) ? await db.prepare('SELECT * FROM orders WHERE status=? ORDER BY created_at DESC, rowid DESC LIMIT 500').all(st) : await db.prepare('SELECT * FROM orders ORDER BY created_at DESC, rowid DESC LIMIT 500').all();
  res.json(await ordersWithItems(rows));
});

// Reservado -> confirmado: NO se descuenta otra vez. Cancelar libera una sola vez.
const changeStatus = async (id, status) => {
  const o = await db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if (!o) throw new HttpError(404, 'Pedido no encontrado');
  if (o.status === 'Cancelado' && status !== 'Cancelado') throw new HttpError(409, 'No se puede reactivar un pedido cancelado');
  await db.prepare("UPDATE orders SET status=?,delivered_at=CASE WHEN ?='Entregado' AND delivered_at='' THEN datetime('now') WHEN ?='Cancelado' THEN '' ELSE delivered_at END,reservation_state=CASE WHEN ?='Cancelado' THEN 'released' WHEN ?<>'Nuevo' THEN 'committed' ELSE reservation_state END WHERE id=?").run(status, status, status, status, status, id);
};
router.patch('/orders/:id', async (req, res) => {
  const status = v.oneOf((req.body || {}).status, cfg.orderStatuses, 'Estado');
  await expireReservations();
  await changeStatus(String(req.params.id).slice(0, 64), status);
  res.json({
    ok: true
  });
});

// CSV con protección contra inyección de fórmulas (=, +, -, @) al abrir en Excel
const csvCell = x => {
  let s = String(x ?? '');
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
router.get('/orders.csv', async (req, res) => {
  await expireReservations();
  const rows = await ordersWithItems(await db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all());
  const head = ['Pedido', 'Fecha', 'Cliente', 'Celular', 'Dirección', 'Pago', 'Total', 'Estado', 'Productos'];
  const lines = rows.map(o => [o.id, o.date, o.name, o.tel, o.addr, o.pay, o.total, o.status, o.items.map(i => `${i.qty} x ${i.name}`).join(' | ')].map(csvCell).join(','));
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="pedidos.csv"'
  });
  res.send('\ufeff' + [head.map(csvCell).join(','), ...lines].join('\r\n'));
});

/* ---------- Banners ---------- */
router.get('/slides', async (req, res) => {
  res.json((await db.prepare('SELECT * FROM slides ORDER BY pos, id').all()).map(slideOut));
});
router.put('/slides/:id', async (req, res) => {
  const id = v.int(Number(req.params.id), 'ID', {
    min: 1
  });
  if (!(await db.prepare('SELECT 1 FROM slides WHERE id=?').get(id))) throw new HttpError(404, 'Banner no encontrado');
  const b = req.body || {};
  const cat = b.cat ? v.oneOf(b.cat, CAT_NAMES, 'Categoría') : '';
  const {customImage, mobileImage, buttonUrl, mediaFit} = bannerOptions(b);
  const theme = v.oneOf(b.textTheme || 'claro', ['claro', 'oscuro'], 'Estilo de texto');
  const timer = v.bool(b.timer) ? 1 : 0;
  const timerEnd = String(b.timerEnd || '').trim();
  if (timerEnd && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(timerEnd)) throw new HttpError(400, 'Fecha de vencimiento no válida');
  if (timer && (!timerEnd || !Number.isFinite(new Date(timerEnd).getTime()))) throw new HttpError(400, 'Selecciona una fecha válida para el contador');
  await db.prepare('UPDATE slides SET tag=?,title=?,sub=?,off=?,cta=?,cat=?,seal=?,active=?,custom_image=?,text_theme=?,timer=?,timer_end=?,button_url=?,media_fit=?,mobile_image=? WHERE id=?').run(v.str(b.tag, 'Etiqueta', {
    max: 40,
    required: false
  }), v.str(b.title, 'Título', {
    min: 2,
    max: 90
  }), v.str(b.sub, 'Texto', {
    max: 200,
    required: false
  }), v.str(b.off, 'Oferta', {
    max: 40,
    required: false
  }), v.str(b.cta, 'Botón', {
    min: 2,
    max: 40
  }), cat, v.str(b.seal, 'Sello', {
    max: 30,
    required: false
  }), v.bool(b.active) ? 1 : 0, customImage, theme, timer, timerEnd, buttonUrl, mediaFit, mobileImage, id);
  res.json({
    ok: true
  });
});

/* ---------- Promociones laterales del hero ---------- */
router.get('/side-promos', async (req, res) => res.json(await getSidePromos()));
router.put('/side-promos/:index', async (req, res) => {
  const idx = v.int(Number(req.params.index), 'Número de promoción', {
    min: 0,
    max: 1
  });
  const b = req.body || {};
  const promos = await getSidePromos();
  promos[idx] = {
    ...bannerOptions(b),
    eyebrow: v.str(b.eyebrow, 'Etiqueta', {
      max: 40,
      required: false
    }),
    title: v.str(b.title, 'Título', {
      min: 2,
      max: 90
    }),
    cta: v.str(b.cta, 'Texto de botón', {
      min: 2,
      max: 40
    }),
    category: b.category ? v.oneOf(b.category, CAT_NAMES, 'Categoría') : '',
    theme: v.oneOf(b.theme, ['morado', 'crema', 'rosa', 'lavanda'], 'Color de tarjeta'),
    active: v.bool(b.active)
  };
  await db.prepare("UPDATE settings SET value=? WHERE key='side_promos'").run(JSON.stringify(promos));
  res.json({
    ok: true,
    promo: promos[idx]
  });
});

/* ---------- Ajustes ---------- */
router.get('/settings', async (req, res) => res.json(await getSettings()));
router.put('/settings', async (req, res) => {
  const b = req.body || {};
  const cur = await getSettings();
  const wa = String(b.wa || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(wa)) throw new HttpError(400, 'WhatsApp debe incluir indicativo, sin + (ej. 573001234567)');
  const incoming = Array.isArray(b.pay) ? b.pay : [];
  const pay = cur.pay.map(m => {
    const n = incoming.find(x => x && x.id === m.id) || {};
    return {
      id: m.id,
      name: v.str(n.name, 'Nombre del método', {
        min: 2,
        max: 60
      }),
      desc: v.str(n.desc, 'Instrucción', {
        max: 160,
        required: false
      }),
      on: v.bool(n.on)
    };
  });
  if (!pay.some(m => m.on)) throw new HttpError(400, 'Debe haber al menos un método de pago activo');
  const allowedIcons = new Set(['truck', 'credit-card', 'heart-handshake', 'messages-square', 'package-check', 'shield-check', 'gift', 'store']);
  const benefits = cur.benefits.map(def => {
    const item = Array.isArray(b.benefits) ? b.benefits.find(x => x?.id === def.id) : null;
    return item ? {
      id: def.id,
      title: v.str(item.title, 'Título del beneficio', {
        min: 2,
        max: 45
      }),
      description: v.str(item.description, 'Descripción del beneficio', {
        max: 95,
        required: false
      }),
      icon: allowedIcons.has(item.icon) ? item.icon : def.icon,
      active: v.bool(item.active)
    } : def;
  });
  const next = {
    name: v.str(b.name, 'Nombre', {
      min: 2,
      max: 60
    }),
    wa,
    free: 0, // La tienda ya no ofrece envío gratuito por umbral de compra.
    note: v.str(b.note, 'Mensaje superior', {
      max: 160,
      required: false
    }),
    pay,
    benefits,
    shipping: {
      pickupEnabled: true,
      pickupAddress: v.str(b.shipping?.pickupAddress || '', 'Dirección de retiro', {
        max: 180,
        required: false
      }),
      deliveryEnabled: true,
      carrier: v.str(b.shipping?.carrier || '', 'Transportadora', {
        max: 70,
        required: false
      }),
      deliveryFee: 0, // Se cotiza manualmente después de confirmar el pago.
      estimatedDays: v.str(b.shipping?.estimatedDays || '', 'Plazo estimado', {
        max: 70,
        required: false
      })
    }
  };
  await setSettings(next);
  res.json(next);
});

/* Audiencias de difusión: clasificación automática, incorporación manual y confirmación explícita.
   No se conecta a WhatsApp ni garantiza que un mensaje haya sido enviado. */
async function broadcastPending(world, operation) {
  const wanted = `s.consent=1 AND s.status='active' AND (s.interest=? OR s.interest='ambos')`;
  if (operation === 'add') return await db.prepare(`SELECT s.tel,s.name FROM subscribers s
    WHERE ${wanted} AND NOT EXISTS (SELECT 1 FROM broadcast_members m WHERE m.tel=s.tel AND m.world=?)
    ORDER BY s.created_at DESC`).all(world, world);
  return await db.prepare(`SELECT m.tel, COALESCE(s.name,'') AS name FROM broadcast_members m
    LEFT JOIN subscribers s ON s.tel=m.tel WHERE m.world=? AND NOT (
    s.tel IS NOT NULL AND s.consent=1 AND s.status='active' AND (s.interest=? OR s.interest='ambos'))
    ORDER BY m.confirmed_at`).all(world, world);
}
router.get('/broadcast/summary', async (req, res) => {
  const output = {};
  for (const world of ['hombre', 'mujer']) output[world] = {
    add: (await broadcastPending(world, 'add')).length,
    remove: (await broadcastPending(world, 'remove')).length
  };
  res.json({
    worlds: output,
    pendingBatches: await db.prepare('SELECT id,world,operation,created_at,json_array_length(contacts_json) count FROM broadcast_batches WHERE confirmed_at IS NULL ORDER BY id DESC LIMIT 20').all()
  });
});
router.post('/broadcast/batches', async (req, res) => {
  const {
    world,
    operation
  } = req.body || {};
  if (!['hombre', 'mujer'].includes(world) || !['add', 'remove'].includes(operation)) throw new HttpError(400, 'Audiencia no válida');
  const openBatch = await db.prepare('SELECT id FROM broadcast_batches WHERE world=? AND operation=? AND confirmed_at IS NULL ORDER BY id DESC LIMIT 1').get(world, operation);
  if (openBatch) return res.status(409).json({
    error: 'Ya tienes un archivo pendiente de confirmar. Descárgalo y confirma su gestión antes de preparar otro.'
  });
  const contacts = await broadcastPending(world, operation);
  if (!contacts.length) throw new HttpError(400, 'No hay contactos pendientes');
  const result = await db.prepare('INSERT INTO broadcast_batches(world,operation,contacts_json) VALUES (?,?,?)').run(world, operation, JSON.stringify(contacts));
  res.status(201).json({
    id: Number(result.lastInsertRowid),
    count: contacts.length
  });
});
router.get('/broadcast/batches/:id.csv', async (req, res) => {
  const batch = await db.prepare('SELECT * FROM broadcast_batches WHERE id=?').get(Number(req.params.id));
  if (!batch) throw new HttpError(404, 'Lote no encontrado');
  const quote = x => '"' + String(x ?? '').replace(/"/g, '""').replace(/^[=+@\-]/, "'$&") + '"';
  const csv = 'nombre,telefono\r\n' + JSON.parse(batch.contacts_json).map(c => [c.name, c.tel].map(quote).join(',')).join('\r\n');
  res.type('text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="galope-${batch.world}-${batch.operation}-${batch.id}.csv"`).send('\ufeff' + csv);
});
router.post('/broadcast/batches/:id/confirm', async (req, res) => {
  const batch = await db.prepare('SELECT * FROM broadcast_batches WHERE id=?').get(Number(req.params.id));
  if (!batch) throw new HttpError(404, 'Lote no encontrado');
  if (batch.confirmed_at) return res.json({
    ok: true,
    alreadyConfirmed: true
  });
  const contacts = JSON.parse(batch.contacts_json);
  await db.native.batch([db.native.prepare(`INSERT OR IGNORE INTO broadcast_members(tel,world)
 SELECT s.tel,b.world FROM broadcast_batches b,json_each(b.contacts_json) j
 JOIN subscribers s ON s.tel=json_extract(j.value,'$.tel')
 WHERE b.id=? AND b.operation='add' AND b.confirmed_at IS NULL AND s.consent=1 AND s.status='active' AND (s.interest=b.world OR s.interest='ambos')`).bind(batch.id), db.native.prepare(`DELETE FROM broadcast_members WHERE world=? AND tel IN (
 SELECT json_extract(j.value,'$.tel') FROM broadcast_batches b,json_each(b.contacts_json) j WHERE b.id=? AND b.operation='remove' AND b.confirmed_at IS NULL)`).bind(batch.world, batch.id), db.native.prepare("UPDATE broadcast_batches SET confirmed_at=datetime('now') WHERE id=? AND confirmed_at IS NULL").bind(batch.id)]);
  res.json({
    ok: true,
    processed: contacts.length
  });
});
/* ---------- Club Galope: contactos y borradores de campañas ---------- */
router.get('/subscribers', async (req, res) => {
  res.json(await db.prepare(`SELECT tel, name, created_at, interest, consent, consent_at, consent_source, status
    FROM subscribers ORDER BY created_at DESC LIMIT 2000`).all());
});
router.patch('/subscribers/:tel', async (req, res) => {
  const tel = String(req.params.tel).slice(0, 25);
  const status = String((req.body || {}).status || '');
  if (!['unsubscribed', 'active'].includes(status)) throw new HttpError(400, 'Estado no válido');
  const row = await db.prepare('SELECT consent FROM subscribers WHERE tel=?').get(tel);
  if (!row) throw new HttpError(404, 'Contacto no encontrado');
  if (status === 'active' && !row.consent) throw new HttpError(400, 'Este contacto no tiene autorización. Debe registrarse nuevamente.');
  await db.prepare("UPDATE subscribers SET status=?, updated_at=datetime('now') WHERE tel=?").run(status, tel);
  res.json({
    ok: true
  });
});
router.delete('/subscribers/:tel', async (req, res) => {
  await db.prepare('DELETE FROM subscribers WHERE tel=?').run(String(req.params.tel).slice(0, 25));
  res.json({
    ok: true
  });
});
const eligibleClause = `consent=1 AND status='active'`;
// Estado real de la futura integración: nunca se declara conectada por defecto.
router.get('/messaging/status', async (req, res) => res.json(whatsAppProvider.status()));

// Vista previa de audiencia. Siempre recalcula consentimiento y bajas al consultar.
router.get('/campaigns/:id/preview', async (req, res) => {
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(Number(req.params.id));
  if (!campaign) throw new HttpError(404, 'Campaña no encontrada');
  const count = (await db.prepare(`SELECT COUNT(*) AS n FROM subscribers WHERE ${eligibleClause}
    AND (?='todos' OR interest=? OR interest='ambos')`).get(campaign.audience, campaign.audience)).n;
  res.json({
    id: campaign.id,
    name: campaign.name,
    audience: campaign.audience,
    eligibleRecipients: count,
    status: campaign.status,
    sendAvailable: false,
    mediaUrl: campaign.media_url || '',
    mediaKind: campaign.media_kind || '',
    mediaName: campaign.media_name || '',
    note: 'Solo previsualización. No se envían mensajes.'
  });
});

// Endpoint reservado: se impide cualquier envío hasta implementar integración oficial,
// controles de autorización, confirmación del administrador y cola transaccional.
router.post('/campaigns/:id/send', async (req, res) => {
  throw new HttpError(501, 'Envío no disponible: integra y configura la API oficial antes de habilitar campañas.');
});
router.get('/campaigns', async (req, res) => {
  const campaigns = await db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC, id DESC LIMIT 200').all();
  const eligible = await db.prepare(`SELECT interest, COUNT(*) AS count FROM subscribers WHERE ${eligibleClause} GROUP BY interest`).all();
  res.json({
    campaigns,
    eligible
  });
});
router.post('/campaigns', async (req, res) => {
  const b = req.body || {};
  const name = v.str(b.name, 'Nombre', {
    min: 2,
    max: 80
  });
  const message = v.str(b.message, 'Mensaje', {
    min: 5,
    max: 1200
  });
  const audience = String(b.audience || 'todos');
  const mediaUrl = String(b.mediaUrl || '');
  const mediaKind = String(b.mediaKind || '');
  const mediaName = v.str(b.mediaName || '', 'Nombre del archivo', {
    max: 120,
    required: false,
    oneLine: false
  });
  if (!['todos', 'hombre', 'mujer'].includes(audience)) throw new HttpError(400, 'Público no válido');
  if (mediaUrl && !['image', 'video'].includes(mediaKind) || !mediaUrl && mediaKind) throw new HttpError(400, 'Adjunto no válido');
  if (mediaUrl && !isOurCampaignMedia(mediaUrl, mediaKind)) throw new HttpError(400, 'Adjunto no válido (súbelo desde el panel)');
  const r = await db.prepare("INSERT INTO campaigns(name,audience,channel,message,media_url,media_kind,media_name,status) VALUES (?,?,'whatsapp',?,?,?,?, 'draft')").run(name, audience, message, mediaUrl, mediaKind, mediaName);
  res.status(201).json({
    id: r.lastInsertRowid,
    ok: true
  });
});
router.delete('/campaigns/:id', async (req, res) => {
  const id = Number(req.params.id);
  const current = await db.prepare("SELECT media_url FROM campaigns WHERE id=? AND status='draft'").get(id);
  await db.prepare("DELETE FROM campaigns WHERE id=? AND status='draft'").run(id);
  if (current && current.media_url) await cleanupCampaignMedia([current.media_url]);
  res.json({
    ok: true
  });
});
router.get('/campaigns/:id/audience.csv', async (req, res) => {
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(Number(req.params.id));
  if (!campaign) throw new HttpError(404, 'Campaña no encontrada');
  const rows = await db.prepare(`SELECT tel,interest,consent_at FROM subscribers WHERE ${eligibleClause}
    AND (?='todos' OR interest=? OR interest='ambos') ORDER BY created_at DESC`).all(campaign.audience, campaign.audience);
  const quote = x => { let value=String(x ?? '').replace(/[\r\n\t]+/g,' ').trim(); if(/^[=+@-]/.test(value)) value="'"+value; return '"'+value.replace(/"/g,'""')+'"'; };
  const csv = 'telefono,interes,fecha_autorizacion\r\n' + rows.map(r => [r.tel, r.interest, r.consent_at].map(quote).join(',')).join('\r\n');
  res.type('text/csv; charset=utf-8').set('Content-Disposition', `attachment; filename="audiencia-campana-${campaign.id}.csv"`).send('\ufeff' + csv);
});
return router;
}
