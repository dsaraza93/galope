'use strict';
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const cfg = require('../config');
const { db, getSettings, getSidePromos, productOut, slideOut } = require('../db');
const { HttpError, v, clean } = require('../http');
const { expireReservations } = require('../reservations');

const router = express.Router();
const limiter = (max, minutes, msg) => rateLimit({
  windowMs: minutes * 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
  message: { error: msg },
});

const COP = (n) => '$' + Math.round(n).toLocaleString('es-CO');

/* ---------- Catálogo público ---------- */
router.get('/store', (req, res) => {
  expireReservations();
  const s = getSettings();
  res.set('Cache-Control', 'no-store');
  res.json({
    settings: {
      name: s.name, wa: s.wa, free: 0, note: (s.pay || []).some(m => m.id === 'cod' && m.on) ? s.note : String(s.note || '').replace(/\s*[·|–-]\s*Pago contraentrega/gi, ''),
      benefits: s.benefits, pay: [], paymentProvider: 'Bold', checkoutReady: false, shipping: {...(s.shipping || {}),pickupEnabled:true,deliveryEnabled:true,deliveryFee:0},
    },
    sidePromos: getSidePromos(),
    categories: cfg.categories,
    products: db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all().map(productOut)
      .map(({ active, ...p }) => p),
    slides: db.prepare('SELECT * FROM slides WHERE active=1 ORDER BY pos, id').all().map(slideOut)
      .map(({ active, ...s2 }) => s2),
  });
});

/* ---------- Crear pedido ---------- */
// IMPORTANTE: el cliente solo envía ids y cantidades. Precios, totales y envío
// se calculan aquí con los datos de la base; nunca se confía en lo que manda el navegador.
const createOrder = db.transaction((input) => {
  const s = getSettings();
  const method = s.pay.find((m) => m.on && m.id === input.pm);
  if (!method) throw new HttpError(400, 'Elige un método de pago válido');

  const getP = db.prepare('SELECT * FROM products WHERE id=? AND active=1');
  const dec = db.prepare('UPDATE products SET stock=stock-?, updated_at=datetime(\'now\') WHERE id=? AND stock>=?');
  const lines = [];
  let subtotal = 0;
  for (const it of input.items) {
    const p = getP.get(it.id);
    if (!p) throw new HttpError(409, 'Un producto de tu carrito ya no está disponible');
    if (p.stock < it.q) throw new HttpError(409, `De "${p.name}" solo quedan ${p.stock} unidades`);
    if (dec.run(it.q, p.id, it.q).changes !== 1) throw new HttpError(409, `"${p.name}" se agotó`);
    lines.push({ id: p.id, name: p.name, price: p.price, q: it.q });
    subtotal += p.price * it.q;
  }
  const freeShipping = 0; // Ningún pedido promete transporte gratuito; se cotiza por separado.
  const id = 'BC-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  db.prepare(`INSERT INTO orders(id,name,tel,addr,pay_id,pay_name,subtotal,free_shipping,total,reservation_state,reserved_until)
              VALUES (?,?,?,?,?,?,?,?,?,'reserved',datetime('now', '+' || ? || ' hours'))`)
    .run(id, input.name, input.tel, input.addr, method.id, method.name, subtotal, freeShipping, subtotal, cfg.reservationHours);
  const insItem = db.prepare('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES (?,?,?,?,?)');
  lines.forEach((l) => insItem.run(id, l.id, l.name, l.price, l.q));

  return { id, lines, subtotal, freeShipping: !!freeShipping, method, store: s };
});

router.post('/orders', limiter(12, 60, 'Demasiados pedidos desde esta conexión. Intenta más tarde.'), (req, res) => {
  // La creación de pedidos se bloquea hasta implementar y verificar el cobro Bold.
  // Nunca registrar una compra como pagada con solo pulsar el botón.
  throw new HttpError(503, 'El pago en línea aún no está habilitado. La tienda no ha realizado ningún cobro.');
  const b = req.body || {};
  if (b.website) return res.status(201).json({ id: 'BC-00000000', total: 0 }); // honeypot anti-bots
  const name = v.str(b.name, 'Nombre', { min: 2, max: 80 });
  const tel = v.str(b.tel, 'Celular', { min: 7, max: 20 }).replace(/[^\d+]/g, '');
  if (!/^\+?\d{7,15}$/.test(tel)) throw new HttpError(400, 'Celular no válido');
  const addr = v.str(b.addr, 'Dirección', { min: 5, max: 200 });
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30) throw new HttpError(400, 'Tu carrito está vacío');
  const seen = new Set();
  const items = b.items.map((i) => {
    const id = v.int(i && i.id, 'Producto', { min: 1, max: 1e9 });
    if (seen.has(id)) throw new HttpError(400, 'Producto repetido en el carrito');
    seen.add(id);
    return { id, q: v.int(i.q, 'Cantidad', { min: 1, max: 99 }) };
  });

  expireReservations();
  const r = createOrder({ name, tel, addr, pm: String(b.pm || ''), items });
  const msg =
    `Hola ${clean(r.store.name)}, quiero hacer el pedido ${r.id}:\n` +
    r.lines.map((l) => `• ${l.q} x ${clean(l.name)} — ${COP(l.price * l.q)}`).join('\n') +
    `\nTotal: ${COP(r.subtotal)}${r.freeShipping ? ' (envío gratis)' : ' + envío por confirmar'}` +
    `\nNombre: ${name}\nCelular: ${tel}\nDirección: ${addr}\nMétodo de pago: ${r.method.name}` +
    (r.method.id === 'cod' ? '' : '\nQuedo atento(a) a los datos para pagar.');
  res.status(201).json({
    id: r.id, total: r.subtotal, freeShipping: r.freeShipping, reservationHours: cfg.reservationHours,
    waUrl: `https://wa.me/${r.store.wa}?text=${encodeURIComponent(msg)}`,
  });
});

/* ---------- Boletín por WhatsApp ---------- */
router.post('/subscribe', limiter(10, 60, 'Demasiados intentos. Intenta más tarde.'), (req, res) => {
  if ((req.body || {}).website) return res.status(201).json({ ok: true });
  const tel = v.str((req.body || {}).tel, 'Celular', { min: 7, max: 20 }).replace(/[^\d+]/g, '');
  if (!/^\+?\d{7,15}$/.test(tel)) throw new HttpError(400, 'Celular no válido');
  const name = String((req.body || {}).name || '').trim().replace(/\s+/g, ' ');
  if (name.length > 60) throw new HttpError(400, 'Nombre demasiado largo');
  const interest = String((req.body || {}).interest || 'ambos');
  if (!['hombre', 'mujer', 'ambos'].includes(interest)) throw new HttpError(400, 'Preferencia no válida');
  if ((req.body || {}).consent !== true) throw new HttpError(400, 'Debes autorizar las comunicaciones comerciales');
  db.prepare(`INSERT INTO subscribers(tel, name, interest, consent, consent_at, consent_source, status, updated_at)
    VALUES (?, ?, ?, 1, datetime('now'), 'web-club', 'active', datetime('now'))
    ON CONFLICT(tel) DO UPDATE SET name=CASE WHEN excluded.name <> '' THEN excluded.name ELSE subscribers.name END, interest=excluded.interest, consent=1,
    consent_at=datetime('now'), consent_source='web-club', status='active', updated_at=datetime('now')`).run(tel, name, interest);
  res.status(201).json({ ok: true });
});

module.exports = router;
