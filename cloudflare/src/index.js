import {database,expireReservations} from './db.js';
import {dataHelpers} from './data.js';
import {config} from './config.js';
import {auth} from './auth.js';
import {payments} from './payments.js';
import {uploads,serveMedia} from './uploads.js';
import {adminRouter} from './admin.js';
import {publicRouter} from './public.js';
import {HttpError} from './http.js';
import {sha} from './crypto.js';
export function context(env){
 const db=database(env.DB),ctx={env,db,cfg:config(env),...dataHelpers(db)};
 ctx.expireReservations=()=>expireReservations(db);ctx.auth=auth(ctx);ctx.payments=payments(ctx);ctx.verifyBoldPayment=row=>ctx.payments.verify(row,{diagnostics:true});ctx.uploads=uploads(ctx);
 ctx.whatsAppProvider={status:()=>({provider:'none',configured:false,sendingEnabled:false,supportsBackgroundSending:false,supportsDeliveryReceipts:false,reason:'API oficial pendiente de configurar. No se enviará ningún mensaje.'})};return ctx;
}
async function limit(ctx,request,path){
 const ip=request.headers.get('CF-Connecting-IP')||'local';const group=path.startsWith('/api/bold/')?'bold':path==='/api/auth/google'?'login':path==='/api/subscribe'?'subscribe':path==='/api/orders'?'orders':'global';
 const max={bold:60,login:15,subscribe:10,orders:12,global:600}[group],now=Date.now();
 const key=await sha(ip+':'+group+':'+Math.floor(now/900000));
 const row=await ctx.db.native.prepare('INSERT INTO rate_limits(key,hits,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,now+900000).first();
 if(row.hits>max)throw new HttpError(429,'Demasiadas solicitudes. Intenta más tarde.');
}
async function bodyRequest(request,max){
 const len=request.headers.get('content-length');if(len&&Number(len)>max)throw new HttpError(413,'Solicitud demasiado grande');
 const chunks=[];let size=0;const reader=request.body?.getReader();if(!reader)return request;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new HttpError(413,'Solicitud demasiado grande');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 return new Request(request.url,{method:request.method,headers:request.headers,body:bytes});
}
function security(response,secure,api){
 const r=new Response(response.body,response),h=r.headers;
 h.set('X-Galope-Release','galope-admin-20261113.1');
 h.set('X-Content-Type-Options','nosniff');h.set('X-Frame-Options','DENY');h.set('Referrer-Policy','strict-origin-when-cross-origin');h.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');h.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 if(secure)h.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 h.set('Content-Security-Policy',"default-src 'self'; script-src 'self' https://checkout.bold.co https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://checkout.bold.co https://*.bold.co https://accounts.google.com/gsi/; frame-src https://checkout.bold.co https://*.bold.co https://accounts.google.com/gsi/; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"+(secure?'; upgrade-insecure-requests':''));
 if(api)h.set('Cache-Control','no-store');return r;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),secure=url.protocol==='https:',api=url.pathname.startsWith('/api/');let response;
  try{
   if(!['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].includes(request.method))throw new HttpError(405,'Método no permitido');
   if(!api){
    if(!['GET','HEAD'].includes(request.method))throw new HttpError(405,'Método no permitido');
    response=url.pathname.startsWith('/uploads/')?await serveMedia(request,env):await env.ASSETS.fetch(request);
   }else{
    const ctx=context(env),webhook=url.pathname==='/api/bold/webhook';
    if(!webhook)await limit(ctx,request,url.pathname);
    const req={raw:request,method:request.method,path:url.pathname.slice(4),query:Object.fromEntries(url.searchParams),headers:Object.fromEntries(request.headers),get:name=>request.headers.get(name),secure,body:{}};
    if(!['GET','HEAD','OPTIONS'].includes(request.method)){
     if(!webhook){
      if(request.headers.get('x-requested-with')!=='galope')throw new HttpError(403,'Solicitud no permitida');
      const origin=request.headers.get('origin');if(origin&&origin!==url.origin)throw new HttpError(403,'Origen no permitido');
      if(request.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'Origen no permitido');
     }
     const multipart=request.headers.get('content-type')?.startsWith('multipart/form-data');
     if(multipart&&!url.pathname.match(/^\/api\/admin\/(uploads|campaign-media|banner-media)$/))throw new HttpError(415,'Formato no admitido');
     if(multipart)await ctx.auth.requireAdmin(req);
     req.raw=await bodyRequest(request,webhook?65536:multipart?(url.pathname.endsWith('/uploads')?6:20)*1024*1024+65536:51200);
     if(!webhook&&!multipart){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'Se requiere JSON');try{req.body=await req.raw.json();if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))throw 0;}catch{throw new HttpError(400,'JSON no válido');}}
    }
    if(webhook){if(request.method!=='POST')throw new HttpError(405,'Método no permitido');response=Response.json(await ctx.payments.webhook(req));}
    else if(req.path.startsWith('/admin/')){await ctx.auth.requireAdmin(req);req.path=req.path.slice(6);response=await adminRouter(ctx).handle(req);}
    else response=await publicRouter(ctx).handle(req);
   }
  }catch(error){
   let status=error.status||500,message=error.message;
   if(String(error).includes('PRODUCT_RESERVED')){status=409;message='Este producto tiene una reserva Bold activa';}
   if(String(error).includes('CANCELLED_ORDER')){status=409;message='No se puede reactivar un pedido cancelado';}
   if(String(error).includes('broadcast_open')){status=409;message='Ya existe un lote pendiente';}
   if(status>=500)console.error(JSON.stringify({error:'request_failed',path:url.pathname,status}));
   const adminDiagnostic=api&&url.pathname.startsWith('/api/admin/')&&error instanceof HttpError;
   response=Response.json({error:status>=500&&!adminDiagnostic?'Servicio no disponible. Intenta más tarde.':message},{status});
  }
  return security(response,secure,api);
 },
 async scheduled(_event,env){
  const ctx=context(env);await ctx.expireReservations();if(!ctx.payments.settings().enabled)return;
  const rows=await ctx.db.prepare("SELECT * FROM bold_checkout_orders WHERE status IN('PENDING','VERIFYING','EXPIRED','REJECTED') AND mode=? ORDER BY last_checked_at,created_at LIMIT 20").all(ctx.payments.settings().mode);
  for(const row of rows)try{await ctx.payments.verify(row);}catch{console.error(JSON.stringify({error:'bold_reconcile_failed',orderId:row.id}));}
 }
};
