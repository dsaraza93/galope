'use strict';

// Bold checkout: sandbox only until the full production flow is certified.

const crypto = require('crypto');

const express = require('express');

const rateLimit = require('express-rate-limit');

const { db, getSettings } = require('../db');

const { HttpError } = require('../http');



const router = express.Router();

const sandbox = process.env.BOLD_MODE !== 'production';

const apiKey = sandbox ? process.env.BOLD_TEST_API_KEY : process.env.BOLD_LIVE_API_KEY;

const secret = sandbox ? process.env.BOLD_TEST_SECRET_KEY : process.env.BOLD_LIVE_SECRET_KEY;

const enabled = sandbox && Boolean(apiKey && secret);



db.exec(`CREATE TABLE IF NOT EXISTS bold_checkout_orders (

  id TEXT PRIMARY KEY,

  access_token_hash TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  expires_at TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING',

  name TEXT NOT NULL,

  tel TEXT NOT NULL,

  document_type TEXT NOT NULL,

  document_number TEXT NOT NULL,

  address TEXT NOT NULL,

  fulfillment TEXT NOT NULL,

  items_json TEXT NOT NULL,

  subtotal INTEGER NOT NULL,

  shipping INTEGER NOT NULL,

  total INTEGER NOT NULL,

  payment_id TEXT NOT NULL DEFAULT '',

  payment_status TEXT NOT NULL DEFAULT ''

);

CREATE INDEX IF NOT EXISTS idx_bold_pending ON bold_checkout_orders(status,expires_at);`);



const sha = value => crypto.createHash('sha256').update(value).digest('hex');

const LIMIT = rateLimit({

  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: 'draft-7',

  legacyHeaders: false

});



router.get('/bold/config', (_req, res) => {

  res.json({ enabled, mode: sandbox ? 'sandbox' : 'production' });

});



router.post('/bold/start', LIMIT, (req, res) => {

  if (!enabled) throw new HttpError(503, 'El pago en línea no está disponible todavía.');



  const b = req.body || {};

  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) {

    throw new HttpError(400, 'Carrito no válido');

  }



  const name = String(b.name || '').trim();

  const tel = String(b.tel || '').trim();

  const docType = String(b.documentType || '');

  const doc = String(b.documentNumber || '').trim();

  if (

    name.length < 2 || name.length > 80 ||

    !/^\+?\d{7,15}$/.test(tel) ||

    !['CC', 'CE', 'PA', 'NIT', 'TI'].includes(docType) ||

    !/^[a-zA-Z0-9-]{5,20}$/.test(doc)

  ) {

    throw new HttpError(400, 'Verifica tus datos personales');

  }



  const s = getSettings();

  const shipCfg = s.shipping || {};

  const fulfillment = b.fulfillment === 'pickup' ? 'pickup' : 'delivery';

  if (fulfillment === 'pickup' ? !shipCfg.pickupEnabled : shipCfg.deliveryEnabled === false) {

    throw new HttpError(400, 'Método de entrega no habilitado');

  }



  const address = fulfillment === 'pickup'

    ? String(shipCfg.pickupAddress || 'Retiro en tienda')

    : String(b.addr || '').trim();

  if (address.length < 5 || address.length > 250) {

    throw new HttpError(400, 'Ingresa una dirección válida');

  }



  const seen = new Set();

  const rows = [];

  let subtotal = 0;

  const getP = db.prepare('SELECT id,name,price,stock FROM products WHERE id=? AND active=1');

  const reserved = db.prepare(`

    SELECT COALESCE(SUM(CAST(json_extract(j.value,'$.q') AS INTEGER)),0) AS n

    FROM bold_checkout_orders o, json_each(o.items_json) j

    WHERE o.status='PENDING'

      AND o.expires_at>datetime('now')

      AND CAST(json_extract(j.value,'$.id') AS INTEGER)=?

  `);



  for (const item of b.items) {

    const id = Number(item.id);

    const qty = Number(item.q);

    if (

      !Number.isSafeInteger(id) || id < 1 ||

      !Number.isSafeInteger(qty) || qty < 1 || qty > 99 || seen.has(id)

    ) {

      throw new HttpError(400, 'Producto o cantidad no válida');

    }

    seen.add(id);

    const p = getP.get(id);

    if (!p || p.stock - Number(reserved.get(id).n) < qty) {

      throw new HttpError(409, 'No hay unidades disponibles de uno de tus productos');

    }

    subtotal += p.price * qty;

    rows.push({ id, q: qty, price: p.price, name: p.name });

  }



  const shipping = fulfillment === 'pickup' || (s.free > 0 && subtotal >= s.free)

    ? 0

    : Math.max(0, Number(shipCfg.deliveryFee || 0));

  const total = subtotal + shipping;

  if (!Number.isSafeInteger(total) || total < 1000) {

    throw new HttpError(400, 'Importe no válido');

  }



  const id = 'BC-' + crypto.randomBytes(10).toString('hex').toUpperCase();

  const token = crypto.randomBytes(24).toString('hex');

  db.prepare(`

    INSERT INTO bold_checkout_orders

      (id,access_token_hash,expires_at,name,tel,document_type,document_number,

       address,fulfillment,items_json,subtotal,shipping,total)

    VALUES (?,?,datetime('now','+15 minutes'),?,?,?,?,?,?,?,?,?,?)

  `).run(id, sha(token), name, tel, docType, doc, address, fulfillment,

    JSON.stringify(rows), subtotal, shipping, total);



  const signature = sha(`${id}${total}COP${secret}`);

  res.status(201).json({

    orderId: id,

    orderToken: token,

    currency: 'COP',

    amount: String(total),

    apiKey,

    integritySignature: signature,

    description: 'Compra Galope ' + id,

    mode: sandbox ? 'sandbox' : 'production'

  });

});



// Idempotent settlement: a PAID order never deducts stock again.

function applyBoldResult(orderId, providerStatus, paymentId, verifiedAmount, verifiedCurrency) {

  const status = String(providerStatus || '').toUpperCase();

  if (!['APPROVED', 'REJECTED', 'FAILED', 'VOIDED', 'PROCESSING', 'PENDING'].includes(status)) {

    throw new HttpError(400, 'Estado Bold no reconocido');

  }



  const reconcile = db.transaction(() => {

    const row = db.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').get(orderId);

    if (!row) throw new HttpError(404, 'Pedido no encontrado');

    if (

      verifiedCurrency !== 'COP' ||

      !Number.isSafeInteger(Number(verifiedAmount)) ||

      Number(verifiedAmount) !== row.total

    ) {

      throw new HttpError(409, 'Importe o moneda inconsistente');

    }



    if (row.status === 'PAID') return 'PAID';

    if (row.status !== 'PENDING') return row.status;



    if (status === 'APPROVED') {

      const products = JSON.parse(row.items_json);

      const getStock = db.prepare('SELECT stock FROM products WHERE id=?');

      const insufficient = products.some(it => Number(getStock.get(it.id)?.stock ?? -1) < it.q);

      if (insufficient) {

        db.prepare(`

          UPDATE bold_checkout_orders

          SET status='REVIEW',payment_status='APPROVED_STOCK_REVIEW',payment_id=?

          WHERE id=? AND status='PENDING'

        `).run(String(paymentId || ''), orderId);

        return 'REVIEW';

      }



      const deduct = db.prepare(`

        UPDATE products SET stock=stock-?,updated_at=datetime('now')

        WHERE id=? AND stock>=?

      `);

      for (const it of products) {

        if (deduct.run(it.q, it.id, it.q).changes !== 1) {

          throw new HttpError(409, 'Conflicto de inventario');

        }

      }

      db.prepare(`

        UPDATE bold_checkout_orders

        SET status='PAID',payment_status='APPROVED',payment_id=?

        WHERE id=? AND status='PENDING'

      `).run(String(paymentId || ''), orderId);

      return 'PAID';

    }



    if (['REJECTED', 'FAILED', 'VOIDED'].includes(status)) {

      db.prepare(`

        UPDATE bold_checkout_orders

        SET status='REJECTED',payment_status=?,payment_id=?

        WHERE id=? AND status='PENDING'

      `).run(status, String(paymentId || ''), orderId);

      return 'REJECTED';

    }



    db.prepare(`

      UPDATE bold_checkout_orders

      SET payment_status=? WHERE id=? AND status='PENDING'

    `).run(status, orderId);

    return 'PENDING';

  });



  return reconcile();

}



async function verifyBold(row) {

  const url = 'https://payments.api.bold.co/v2/payment-voucher/' + encodeURIComponent(row.id);

  let response;



  try {

    response = await fetch(url, {

      method: 'GET',

      headers: {

        Authorization: 'x-api-key ' + apiKey,

        Accept: 'application/json'

      },

      signal: AbortSignal.timeout(10000)

    });

  } catch (error) {

    console.error('[BOLD] Error de conexión:', error.message);

    throw new HttpError(502, 'No fue posible conectar con Bold');

  }



  if (!response.ok) {
    // Capture the actual API diagnostic BEFORE throwing; never read a successful
    // response body twice (response.text() consumes the stream).
    let diagnostic = '';
    try {
      diagnostic = await response.text();
    } catch (error) {
      diagnostic = '[No se pudo leer el cuerpo de la respuesta]';
    }
    // Minimize accidental disclosure of credentials in provider error bodies.
    diagnostic = diagnostic
      .replace(/(client_secret|secret|api[_-]?key|token|authorization)(["\s:=]+)([^"\s,}]+)/gi, '$1$2[REDACTADO]')
      .slice(0, 1200);
    console.error('[BOLD] Consulta rechazada:', {
      httpStatus: response.status,
      orderId: row.id,
      body: diagnostic
    });
    throw new HttpError(502, 'Bold rechazó la consulta. HTTP ' + response.status);
  }

  const payment = await response.json();

  if (payment.reference_id && payment.reference_id !== row.id) {

    throw new HttpError(502, 'Referencia de pago inconsistente');

  }



  const status = String(payment.payment_status || '').toUpperCase();

  if (!['APPROVED', 'REJECTED', 'FAILED', 'VOIDED', 'PROCESSING', 'PENDING'].includes(status)) {

    return status;

  }



  const amount = payment.total ?? payment.amount?.total ?? payment.amount?.total_amount;

  const currency = payment.currency ?? payment.amount?.currency;

  if (currency != null && currency !== 'COP') {

    throw new HttpError(409, 'Moneda inconsistente');

  }

  // Never settle without an independently verified numeric amount.

  applyBoldResult(

    row.id,

    status,

    payment.transaction_id || payment.payment_id,

    amount,

    'COP'

  );

  return status;

}



router.post('/bold/status', LIMIT, async (req, res) => {

  const id = String(req.body?.orderId || '');

  const token = String(req.body?.orderToken || '');

  const row = db.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').get(id);

  if (!row || token.length !== 48 || sha(token) !== row.access_token_hash) {

    throw new HttpError(404, 'Pedido no encontrado');

  }

  if (row.status === 'PENDING' && enabled) await verifyBold(row);

  const current = db.prepare('SELECT status,payment_status FROM bold_checkout_orders WHERE id=?').get(id);

  res.json({

    orderId: id,

    status: current.status,

    paymentStatus: current.payment_status || 'PROCESSING'

  });

});



module.exports = router;

module.exports.verifyBoldPayment = verifyBold;

module.exports.applyBoldResult = applyBoldResult;
