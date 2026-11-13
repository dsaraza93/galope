'use strict';
// Webhook público y firmado de Bold. Esta ruta se monta ANTES de express.json y del CSRF.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { applyBoldResult } = require('./bold');
const router = express.Router();
const sandbox = process.env.BOLD_MODE !== 'production';
const key = sandbox ? '' : process.env.BOLD_LIVE_SECRET_KEY;

// Guardamos UUIDs recibidos para detectar reintentos y evitar re-procesar.
db.exec(`CREATE TABLE IF NOT EXISTS bold_webhook_events (
  event_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

router.post('/', (req,res) => {
  if (!Buffer.isBuffer(req.body)) return res.status(415).json({error:'Se requiere JSON'});
  if (!sandbox && !key) return res.status(503).json({error:'Webhook no configurado'});
  const signature=String(req.get('x-bold-signature')||'').trim();
  if(!/^[a-f0-9]{64}$/i.test(signature)) return res.status(401).json({error:'Firma requerida'});
  // Bold: HMAC-SHA256(base64(body JSON crudo)); en sandbox, llave vacía.
  const base64=req.body.toString('base64');
  const expected=crypto.createHmac('sha256', key).update(base64).digest('hex');
  if(!crypto.timingSafeEqual(Buffer.from(signature.toLowerCase(),'hex'),Buffer.from(expected,'hex')))
    return res.status(401).json({error:'Firma incorrecta'});
  let event;
  try { event=JSON.parse(req.body.toString('utf8')); } catch { return res.status(400).json({error:'JSON inválido'}); }
  const eventId=String(event?.id||'');
  const type=String(event?.type||'');
  const data=event?.data;
  const orderId=String(data?.metadata?.reference||'');
  if(!eventId || eventId.length>150 || !/^BC-[A-F0-9]{20}$/.test(orderId) || !data || typeof data!=='object')
    return res.status(400).json({error:'Evento o referencia inválidos'});
  if(!['SALE_APPROVED','SALE_REJECTED'].includes(type))
    return res.status(200).json({ok:true,ignored:true});
  const existing=db.prepare('SELECT event_id FROM bold_webhook_events WHERE event_id=?').get(eventId);
  if(existing) return res.status(200).json({ok:true,duplicate:true});
  const amount=data.amount;
  if(!amount || amount.currency !== 'COP' || !Number.isSafeInteger(amount.total))
    return res.status(400).json({error:'Importe inválido'});
  // Verifica pedido, importe y moneda; la transacción de stock es idempotente.
  try {
    const result=applyBoldResult(orderId,type==='SALE_APPROVED'?'APPROVED':'REJECTED',data.payment_id||event.subject,amount.total,amount.currency);
    db.prepare('INSERT OR IGNORE INTO bold_webhook_events(event_id,order_id,event_type) VALUES (?,?,?)').run(eventId,orderId,type);
    return res.status(200).json({ok:true,status:result});
  } catch(err) {
    console.error('[BOLD WEBHOOK]',err.message);
    return res.status(err.status && err.status < 500 ? err.status:500).json({error:'No se pudo conciliar el evento'});
  }
});
module.exports=router;
