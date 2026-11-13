import {Router} from './router.js';
import {HttpError,v} from './http.js';
export function publicRouter(ctx){
 const {db,cfg,getSettings,getSidePromos,productOut,slideOut,expireReservations,payments,auth}=ctx;
 const router=new Router();
 router.get('/store',async(req,res)=>{
  await expireReservations();const s=await getSettings();const bold=payments.settings();
  res.json({settings:{name:s.name,wa:s.wa,free:0,note:(s.pay||[]).some(m=>m.id==='cod'&&m.on)?s.note:String(s.note||'').replace(/\s*[·|–-]\s*Pago contraentrega/gi,''),benefits:s.benefits,pay:[],paymentProvider:'Bold',checkoutReady:bold.enabled,shipping:{...(s.shipping||{}),pickupEnabled:true,deliveryEnabled:true,deliveryFee:0}},sidePromos:await getSidePromos(),categories:cfg.categories,products:(await db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all()).map(productOut).map(({active,...p})=>p),slides:(await db.prepare('SELECT * FROM slides WHERE active=1 ORDER BY pos,id').all()).map(slideOut).map(({active,...s})=>s)});
 });
 router.post('/orders',()=>{throw new HttpError(503,'Usa el checkout Bold para confirmar un pago seguro. No se ha realizado ningún cobro.');});
 router.post('/subscribe',async(req,res)=>{
  const b=req.body||{};if(b.website)return res.status(201).json({ok:true});
  const tel=v.str(b.tel,'Celular',{min:7,max:20}).replace(/[^\d+]/g,'');if(!/^\+?\d{7,15}$/.test(tel))throw new HttpError(400,'Celular no válido');
  const name=String(b.name||'').trim().replace(/\s+/g,' '),interest=String(b.interest||'ambos');if(name.length>60||!['hombre','mujer','ambos'].includes(interest)||b.consent!==true)throw new HttpError(400,'Verifica el nombre, la preferencia y la autorización de comunicaciones');
  await db.prepare(`INSERT INTO subscribers(tel,name,interest,consent,consent_at,consent_source,status,updated_at) VALUES(?,?,?,1,datetime('now'),'web-club','active',datetime('now')) ON CONFLICT(tel) DO UPDATE SET name=CASE WHEN excluded.name<>'' THEN excluded.name ELSE subscribers.name END,interest=excluded.interest,consent=1,consent_at=datetime('now'),consent_source='web-club',status='active',updated_at=datetime('now')`).run(tel,name,interest);res.status(201).json({ok:true});
 });
 router.get('/auth/status',async(req,res)=>res.json(await auth.status(req)));
 router.post('/auth/google',async(req,res)=>res.json(await auth.login(req.body?.credential,req,res)));
 router.post('/auth/logout',async(req,res)=>{await auth.logout(req,res);res.json({ok:true});});
 router.get('/bold/config',(_req,res)=>res.json(payments.settings()));
 router.post('/bold/start',async(req,res)=>{await expireReservations();res.status(201).json(await payments.start(req.body||{},req));});
 router.post('/bold/status',async(req,res)=>res.json(await payments.status(req.body||{})));
 router.get('/addi/status',(_req,res)=>res.json({widgetConfigured:false,checkoutEnabled:false,pending:true,reason:'Pendiente credenciales y certificación Addi'}));
 router.get('/addi/config',(_req,res)=>res.json({enabled:false,pending:true,reason:'Addi pendiente de integración'}));
 router.get('/addi/eligibility',(_req,res)=>res.json({enabled:false,pending:true,eligible:false}));
 return router;
}
