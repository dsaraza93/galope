'use strict';
// Addi: consulta oficial de disponibilidad para el monto. NO crea pagos.
const express = require('express');
const router = express.Router();
const SLUG = String(process.env.ADDI_ALLY_SLUG || '').trim();
const validSlug = /^[a-zA-Z0-9_-]{2,100}$/.test(SLUG);
router.get('/addi/status', (_req,res)=> {
  res.set('Cache-Control','no-store');
  res.json({ widgetConfigured: validSlug, checkoutEnabled: false, reason: 'Pendiente credenciales y certificación Addi' });
});
router.get('/addi/eligibility', async (req,res)=> {
  res.set('Cache-Control','no-store');
  if (!validSlug) return res.status(503).json({available:false, reason:'Comercio Addi sin configurar'});
  const raw=String(req.query.amount || '');
  if (!/^\d{1,12}$/.test(raw)) return res.status(400).json({available:false,reason:'Monto no válido'});
  const amount=Number(raw);
  if (!Number.isSafeInteger(amount) || amount<=0) return res.status(400).json({available:false,reason:'Monto no válido'});
  try {
    const url=`https://channels-public-api.addi.com/allies/${encodeURIComponent(SLUG)}/config?requestedamount=${amount}`;
    const r=await fetch(url,{headers:{'Accept':'application/json'},signal:AbortSignal.timeout(6500)});
    if (!r.ok) return res.status(502).json({available:false,reason:'Addi no respondió correctamente'});
    const j=await r.json();
    const min=Number(j.minAmount), max=Number(j.maxAmount);
    const eligible= j.isActiveAlly === true && j.policy?.isVisible === true && Number.isFinite(min) && Number.isFinite(max) && amount>=min && amount<=max;
    return res.json({available:eligible,minAmount:Number.isFinite(min)?min:null,maxAmount:Number.isFinite(max)?max:null,checkoutEnabled:false});
  } catch(e) { console.error('[addi/eligibility]',e.message); return res.status(502).json({available:false,reason:'Consulta Addi temporalmente no disponible'}); }
});
module.exports=router;
