import {env,SELF,applyD1Migrations,reset} from 'cloudflare:test';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {SignJWT,generateKeyPair,exportJWK} from 'jose';
import worker,{context} from '../src/index.js';
import {sha,hmac,base64} from '../src/crypto.js';
import {PhotonImage} from '@cf-wasm/photon';
let cookie,seq=0;
const payload=()=>({name:'Cliente de prueba',tel:'573001234567',documentType:'CC',documentNumber:'12345678',fulfillment:'delivery',addr:'Calle 1 numero 2 Bogota',items:[{id:1,q:1}]});
async function call(path,{method='GET',body,admin=false,headers={},raw}={}){
 const h={'x-requested-with':'galope',...headers};if(admin)h.cookie=cookie;
 if(body!==undefined)h['content-type']='application/json';
 return worker.fetch(new Request('https://shop.example.test/api'+path,{method,headers:h,body:raw??(body===undefined?undefined:JSON.stringify(body))}),env);
}
async function json(path,opts){const r=await call(path,opts);const j=await r.json();if(!r.ok)throw new Error(JSON.stringify({status:r.status,body:j,path}));return j;}
async function checkout(b=payload(),key='test-intent-'+String(++seq).padStart(20,'0')){return json('/bold/start',{method:'POST',body:b,headers:{'Idempotency-Key':key}});}
async function stock(){return (await env.DB.prepare('SELECT stock FROM products WHERE id=1').first()).stock;}
async function event(order,{id='event-'+(++seq),type='SALE_APPROVED',amount=64900,payment='payment-'+(++seq),currency='COP',secret=env.BOLD_WEBHOOK_SECRET}={}){
 const raw=JSON.stringify({id,type,subject:payment,data:{payment_id:payment,metadata:{reference:order.orderId},amount:{total:amount,currency}}});
 return {id,raw,headers:{'content-type':'application/json','x-bold-signature':await hmac(secret,base64(new TextEncoder().encode(raw)))}};
}
async function sendEvent(e){return call('/bold/webhook',{method:'POST',raw:e.raw,headers:e.headers});}
beforeEach(async()=>{
 await reset();await applyD1Migrations(env.DB,env.TEST_MIGRATIONS);await env.DB.exec(env.TEST_DEMO);
 const token='a'.repeat(64);cookie='galope_sid='+token;
 await env.DB.prepare('INSERT INTO sessions(token_hash,email,name,expires_at) VALUES(?,?,?,?)').bind(await sha(token),'admin@example.test','Admin',Date.now()+3600000).run();
});
afterEach(()=>vi.restoreAllMocks());
describe('Interfaz y autenticación',()=>{
 it('sin configuración Google publica el catálogo pero bloquea login y sesiones existentes',async()=>{
  for(const missing of [{GOOGLE_CLIENT_ID:''},{ADMIN_EMAILS:''}]){
   const target={...env,...missing};
   const request=path=>new Request('https://shop.example.test/api'+path,{headers:{cookie}});
   expect((await worker.fetch(request('/store'),target)).status).toBe(200);
   const status=await worker.fetch(request('/auth/status'),target);expect((await status.json()).authenticated).toBe(false);
   expect((await worker.fetch(request('/admin/products'),target)).status).toBe(401);
   const login=new Request('https://shop.example.test/api/auth/google',{method:'POST',headers:{'x-requested-with':'galope','content-type':'application/json'},body:JSON.stringify({credential:'invalid'})});
   expect((await worker.fetch(login,target)).status).toBe(503);
  }
 });
 it('sirve el diseño, scripts y logos originales',async()=>{for(const path of ['/','/css/app.css','/js/admin.js','/img/logo.webp']){const r=await SELF.fetch('https://shop.example.test'+path);expect(r.status).toBe(200);expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(100);}});
 it('catálogo completo, cabeceras y configuración de Google',async()=>{const r=await call('/store');expect(r.status).toBe(200);expect(r.headers.get('x-galope-release')).toBe('bold-rejection-20261030.4');expect(r.headers.get('content-security-policy')).toContain("object-src 'none'");const s=await r.json();expect(s.products).toHaveLength(6);expect(s.slides).toHaveLength(5);expect(s.sidePromos).toHaveLength(2);expect(s.categories).toHaveLength(8);const a=await json('/auth/status');expect(a.authenticated).toBe(false);expect(a.mode).toBe('google');});
 it('protege administración, revocación y expiración',async()=>{expect((await call('/admin/products')).status).toBe(401);expect((await json('/auth/status',{admin:true})).authenticated).toBe(true);await json('/auth/logout',{method:'POST',body:{},admin:true});expect((await call('/admin/products',{admin:true})).status).toBe(401);});
 it('rechaza credenciales falsas, CSRF y origen externo',async()=>{expect((await call('/auth/google',{method:'POST',body:{credential:'invalid'}})).status).toBe(400);expect((await call('/auth/google',{method:'POST',body:{credential:'x'.repeat(120)}})).status).toBe(401);expect((await call('/subscribe',{method:'POST',body:{},headers:{'x-requested-with':''}})).status).toBe(403);expect((await call('/subscribe',{method:'POST',body:{},headers:{origin:'https://evil.test'}})).status).toBe(403);});
 it('verifica criptográficamente Google y autoriza solo correos permitidos',async()=>{
  const {privateKey,publicKey}=await generateKeyPair('RS256',{extractable:true});const jwk=await exportJWK(publicKey);jwk.kid='test-key';jwk.alg='RS256';
  vi.spyOn(globalThis,'fetch').mockImplementation(async url=>{expect(String(url)).toContain('googleapis.com/oauth2/v3/certs');return Response.json({keys:[jwk]});});
  const token=await new SignJWT({email:'admin@example.test',email_verified:true,name:'Admin',azp:env.GOOGLE_CLIENT_ID}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('google-user').setIssuer('https://accounts.google.com').setAudience(env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const r=await call('/auth/google',{method:'POST',body:{credential:token}});expect(r.status).toBe(200);expect(r.headers.get('set-cookie')).toContain('HttpOnly');expect(r.headers.get('set-cookie')).toContain('Secure');
  const wrong=await new SignJWT({email:'attacker@example.test',email_verified:true}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setSubject('other').setIssuer('https://accounts.google.com').setAudience(env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('1h').sign(privateKey);
  expect((await call('/auth/google',{method:'POST',body:{credential:wrong}})).status).toBe(403);
 });
 it('mantiene Addi y Sistecrédito pendientes y producción apagada',async()=>{expect((await json('/addi/status')).checkoutEnabled).toBe(false);const prod={...env,BOLD_MODE:'production',BOLD_LIVE_API_KEY:'fixture',BOLD_LIVE_SECRET_KEY:'fixture'};const r=await worker.fetch(new Request('https://shop.example.test/api/bold/config'),prod);expect((await r.json()).enabled).toBe(false);});
});
describe('Administración completa y medios R2',()=>{
 it('CRUD productos, categorías, edades, inventario y validación',async()=>{const product={name:'Producto =prueba',cat:'Sombreros',categories:['Sombreros','Gorras'],world:'mujer',ageMin:36,ageMax:90,price:15000,stock:4,active:true,imgs:[]};const p=await json('/admin/products',{method:'POST',body:product,admin:true});expect(p.categories).toEqual(product.categories);expect(p.world).toBe('mujer');expect(p.stock).toBe(4);await json('/admin/products/'+p.id,{method:'PUT',body:{...product,stock:3},admin:true});expect((await json('/admin/products',{admin:true})).find(x=>x.id===p.id).stock).toBe(3);expect((await call('/admin/products',{method:'POST',body:{...product,price:-1},admin:true})).status).toBe(400);await json('/admin/products/'+p.id,{method:'DELETE',admin:true,body:{}});expect((await json('/admin/products',{admin:true})).some(x=>x.id===p.id)).toBe(false);});
 it('edita banners y mantiene envío cotizado por separado, sin cobro en Bold',async()=>{const slides=await json('/admin/slides',{admin:true});await json('/admin/slides/1',{method:'PUT',admin:true,body:{...slides[0],title:'Nueva oferta',timer:false}});expect((await json('/admin/slides',{admin:true}))[0].title).toBe('Nueva oferta');const promos=await json('/admin/side-promos',{admin:true});await json('/admin/side-promos/0',{method:'PUT',admin:true,body:{...promos[0],title:'Nueva promo'}});expect((await json('/admin/side-promos',{admin:true}))[0].title).toBe('Nueva promo');const s=await json('/admin/settings',{admin:true});await json('/admin/settings',{method:'PUT',admin:true,body:{...s,name:'Galope prueba',shipping:{deliveryFee:8000,deliveryEnabled:true,pickupEnabled:true,pickupAddress:'Calle tienda 123'}}});expect((await json('/admin/settings',{admin:true})).shipping.deliveryFee).toBe(0);const purchase=await checkout();expect(purchase.amount).toBe('64900');expect((await env.DB.prepare('SELECT shipping,total FROM bold_checkout_orders WHERE id=?').bind(purchase.orderId).first())).toEqual({shipping:0,total:64900});});
 it('ofrece retiro y envío incluso si el ajuste antiguo desactivó ambos métodos',async()=>{
  const s=await json('/admin/settings',{admin:true});
  await json('/admin/settings',{method:'PUT',admin:true,body:{...s,shipping:{...s.shipping,pickupEnabled:false,deliveryEnabled:false,pickupAddress:'Calle tienda 123',deliveryFee:8000}}});
  const settings=(await json('/store')).settings.shipping;
  expect(settings.pickupEnabled).toBe(true);
  expect(settings.deliveryEnabled).toBe(true);
  const pickup=await checkout({...payload(),fulfillment:'pickup',addr:'Retiro en tienda'});
  const delivery=await checkout(payload());
  expect(pickup.amount).toBe('64900');
  expect(delivery.amount).toBe('64900');
  const rows=await env.DB.prepare('SELECT fulfillment,shipping,total FROM bold_checkout_orders ORDER BY rowid').all();
  expect(rows.results).toEqual([{fulfillment:'pickup',shipping:0,total:64900},{fulfillment:'delivery',shipping:0,total:64900}]);
 });
 it('guarda y publica medios completos y URL de producto en todos los banners',async()=>{
  const [banner]=await json('/admin/slides',{admin:true});
  const video='/uploads/'+'b'.repeat(32)+'.mp4';
  await json('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,timer:false,customImage:video,buttonUrl:'#producto-1',mediaFit:'contain'}});
  const [side]=await json('/admin/side-promos',{admin:true});
  await json('/admin/side-promos/0',{method:'PUT',admin:true,body:{...side,customImage:video,buttonUrl:'https://shop.example.test/#producto-2',mediaFit:'cover'}});
  const store=await json('/store');
  expect(store.slides[0]).toMatchObject({customImage:video,buttonUrl:'#producto-1',mediaFit:'contain'});
  expect(store.sidePromos[0]).toMatchObject({customImage:video,buttonUrl:'https://shop.example.test/#producto-2',mediaFit:'cover'});
  for(const buttonUrl of ['javascript:alert(1)','//evil.test','/\\\\evil.test','data:text/html,hi']) {
    expect((await call('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,buttonUrl}})).status).toBe(400);
    expect((await call('/admin/side-promos/0',{method:'PUT',admin:true,body:{...side,buttonUrl}})).status).toBe(400);
  }
  expect((await call('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,customImage:'https://evil.test/x.mp4'}})).status).toBe(400);
  expect((await call('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,mediaFit:'stretch'}})).status).toBe(400);
 });
 it('guarda campañas completas con medios para escritorio y móvil',async()=>{
  const [banner]=await json('/admin/slides',{admin:true});
  const desktop='/uploads/'+'d'.repeat(32)+'.webp',mobile='/uploads/'+'e'.repeat(32)+'.mp4';
  await json('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,timer:false,mediaFit:'artwork',customImage:desktop,mobileImage:mobile,buttonUrl:'#producto-1'}});
  expect((await json('/store')).slides.find(s=>s.id===banner.id)).toMatchObject({mediaFit:'artwork',customImage:desktop,mobileImage:mobile,buttonUrl:'#producto-1'});
  expect((await call('/admin/slides/'+banner.id,{method:'PUT',admin:true,body:{...banner,timer:false,mobileImage:'https://evil.test/x.mp4'}})).status).toBe(400);
 });
 it('conserva resolución horizontal de banners por encima de 1200 px',async()=>{
  const image=new PhotonImage(new Uint8Array(1600*500*4).fill(255),1600,500);const bytes=image.get_bytes();image.free();
  const form=new FormData();form.append('file',new File([bytes],'wide.png',{type:'image/png'}));
  const {url}=await json('/admin/banner-media',{method:'POST',admin:true,raw:form});
  const saved=await env.MEDIA.get(url.slice(9));const decoded=PhotonImage.new_from_byteslice(new Uint8Array(await saved.arrayBuffer()));
  try{expect(decoded.get_width()).toBe(1600);expect(decoded.get_height()).toBe(500);}finally{decoded.free();}
 });
 it('sube videos para banners y protege el endpoint',async()=>{
  const makeForm=()=>{const f=new FormData();f.append('file',new File([new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0])],'banner.mp4'));return f;};
  expect((await call('/admin/banner-media',{method:'POST',raw:makeForm()})).status).toBe(401);
  const r=await json('/admin/banner-media',{method:'POST',admin:true,raw:makeForm()});
  expect(r.kind).toBe('video');expect(await env.MEDIA.head(r.url.slice(9))).toBeTruthy();
  const fake=new FormData();fake.append('file',new File(['<html>bad</html>'],'fake.mp4'));
  expect((await call('/admin/banner-media',{method:'POST',admin:true,raw:fake})).status).toBe(400);
 });
 it('recodifica imagen a WebP, almacena R2 y sirve rango/ETag sin EXIF',async()=>{
  const image=new PhotonImage(new Uint8Array([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]),2,2);const bytes=image.get_bytes();image.free();
  const form=new FormData();form.append('file',new File([bytes],'photo.png',{type:'image/png'}));
  const r=await call('/admin/uploads',{method:'POST',admin:true,raw:form});expect(r.status).toBe(201);const {url}=await r.json();expect(url).toMatch(/^\/uploads\/[a-f0-9]{32}\.webp$/);
  const media=await worker.fetch(new Request('https://shop.example.test'+url),env);expect(media.headers.get('content-type')).toBe('image/webp');const out=new Uint8Array(await media.arrayBuffer());expect(String.fromCharCode(...out.slice(8,12))).toBe('WEBP');
  const range=await worker.fetch(new Request('https://shop.example.test'+url,{headers:{range:'bytes=0-9'}}),env);expect(range.status).toBe(206);expect((await range.arrayBuffer()).byteLength).toBe(10);
  expect((await worker.fetch(new Request('https://shop.example.test'+url,{headers:{'if-none-match':media.headers.get('etag')}}),env)).status).toBe(304);
 });
 it('rechaza archivos falsos y conserva videos de campañas',async()=>{const f=new FormData();f.append('file',new File(['<svg onload="bad()"/>'],'x.png'));expect((await call('/admin/uploads',{method:'POST',admin:true,raw:f})).status).toBe(400);
 const v=new FormData();v.append('file',new File([new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0])],'clip.mp4'));const r=await json('/admin/campaign-media',{method:'POST',admin:true,raw:v});expect(r.kind).toBe('video');expect(await env.MEDIA.head(r.url.slice(9))).toBeTruthy();});
});
describe('Club, campañas y difusión',()=>{
 async function subscribe(tel='573009999999'){return json('/subscribe',{method:'POST',body:{name:'=Cliente',tel,consent:true,interest:'ambos'}});}
 it('respeta consentimiento, bajas, campañas, audiencias y exportación',async()=>{expect((await call('/subscribe',{method:'POST',body:{tel:'573009999999'}})).status).toBe(400);await subscribe();const c=await json('/admin/campaigns',{method:'POST',admin:true,body:{name:'Campaña prueba',message:'Novedades de la tienda',audience:'hombre'}});expect((await json('/admin/campaigns/'+c.id+'/preview',{admin:true})).eligibleRecipients).toBe(1);const csv=await call('/admin/campaigns/'+c.id+'/audience.csv',{admin:true});expect(await csv.text()).toContain('573009999999');expect((await call('/admin/campaigns/'+c.id+'/send',{method:'POST',admin:true,body:{}})).status).toBe(501);await json('/admin/subscribers/573009999999',{method:'PATCH',admin:true,body:{status:'unsubscribed'}});expect((await json('/admin/campaigns/'+c.id+'/preview',{admin:true})).eligibleRecipients).toBe(0);await json('/admin/campaigns/'+c.id,{method:'DELETE',admin:true,body:{}});expect((await json('/admin/campaigns',{admin:true})).campaigns).toHaveLength(0);});
 it('lotes de difusión confirmados una sola vez y CSV protegido',async()=>{await subscribe();expect((await json('/admin/broadcast/summary',{admin:true})).worlds.hombre.add).toBe(1);const b=await json('/admin/broadcast/batches',{method:'POST',admin:true,body:{world:'hombre',operation:'add'}});const csv=await call('/admin/broadcast/batches/'+b.id+'.csv',{admin:true});expect(await csv.text()).toContain("'=Cliente");await json('/admin/broadcast/batches/'+b.id+'/confirm',{method:'POST',body:{},admin:true});expect((await json('/admin/broadcast/batches/'+b.id+'/confirm',{method:'POST',body:{},admin:true})).alreadyConfirmed).toBe(true);expect((await json('/admin/broadcast/summary',{admin:true})).worlds.hombre.add).toBe(0);});
});
describe('Bold atómico, webhook e inventario',()=>{
 it('calcula precio/transportes en servidor y firma sin exponer la llave privada',async()=>{const o=await checkout({...payload(),price:1,total:1});expect(o.amount).toBe('64900');expect(o.integritySignature).toBe(await sha(o.orderId+'64900COP'+env.BOLD_TEST_SECRET_KEY));expect(JSON.stringify(o)).not.toContain(env.BOLD_TEST_SECRET_KEY);expect(await stock()).toBe(29);});
 it('rechaza métodos de entrega manipulados antes de reservar stock',async()=>{const before=await stock();const response=await call('/bold/start',{method:'POST',body:{...payload(),fulfillment:'other'},headers:{'Idempotency-Key':'invalid-fulfillment-test-0001'}});expect(response.status).toBe(400);expect(await stock()).toBe(before);});
 it('idempotencia de inicio, mismo pedido y rechazo de cambios',async()=>{const key='one-key-'+String(++seq).padStart(20,'0'),o=await checkout(payload(),key),again=await checkout(payload(),key);expect(again).toEqual(o);expect(await stock()).toBe(29);expect((await call('/bold/start',{method:'POST',body:{...payload(),name:'Different'},headers:{'Idempotency-Key':key}})).status).toBe(409);});
 it('no vende la última unidad dos veces con inicios concurrentes',async()=>{await env.DB.prepare('UPDATE products SET stock=1 WHERE id=1').run();const r=await Promise.all([call('/bold/start',{method:'POST',body:payload(),headers:{'Idempotency-Key':'concurrent-key-00000001'}}),call('/bold/start',{method:'POST',body:payload(),headers:{'Idempotency-Key':'concurrent-key-00000002'}})]);expect(r.map(x=>x.status).sort()).toEqual([201,409]);expect(await stock()).toBe(0);});
 it('webhooks repetidos/concurrentes descuentan una sola vez y crean pedido normal',async()=>{const o=await checkout(),e=await event(o);const replies=await Promise.all([sendEvent(e),sendEvent(e)]);expect(replies.map(r=>r.status)).toEqual([200,200]);expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT COUNT(*) n FROM bold_webhook_events').first()).n).toBe(1);const orders=await json('/admin/orders',{admin:true});expect(orders).toHaveLength(1);expect(orders[0].id).toBe(o.orderId);expect(orders[0].items[0].qty).toBe(1);expect((await call('/admin/products/1',{method:'DELETE',admin:true,body:{}})).status).toBe(200);});
 it('firma incorrecta, cuerpo alterado, importe y moneda no pueden conciliar',async()=>{const o=await checkout();for(const config of [{secret:'wrong'},{amount:1},{currency:'USD'}]){const e=await event(o,config);expect((await sendEvent(e)).status).toBe(config.secret?401:409);}expect((await env.DB.prepare('SELECT COUNT(*) n FROM bold_webhook_events').first()).n).toBe(0);expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PENDING');});
 it('rechaza evento reutilizado con otro contenido y pago reutilizado en otro pedido',async()=>{const a=await checkout(),b=await checkout(),id='same-event-'+(++seq),payment='same-payment-'+seq;expect((await sendEvent(await event(a,{id,payment}))).status).toBe(200);expect((await sendEvent(await event(b,{id,payment}))).status).toBe(409);expect((await sendEvent(await event(b,{payment}))).status).toBe(409);expect(await stock()).toBe(28);});
 it('un webhook aislado de rechazo conserva la reserva y la aprobación posterior no descuenta de nuevo',async()=>{const o=await checkout();await sendEvent(await event(o,{type:'SALE_REJECTED'}));expect(await stock()).toBe(29);await sendEvent(await event(o,{type:'SALE_REJECTED'}));expect(await stock()).toBe(29);await sendEvent(await event(o));expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PAID');});
 it('pasar el plazo conserva el stock; la aprobación tardía crea el pedido sin doble descuento',async()=>{const o=await checkout();await env.DB.prepare("UPDATE bold_checkout_orders SET expires_at=datetime('now','-1 minute')").run();await context(env).expireReservations();await context(env).expireReservations();expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT status,stock_held FROM bold_checkout_orders').first())).toEqual({status:'VERIFYING',stock_held:1});await sendEvent(await event(o));expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PAID');expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT COUNT(*) n FROM orders').first()).n).toBe(1);});
 it('protege productos reservados y cancela pedidos sin doble devolución',async()=>{const o=await checkout();const approval=await event(o);expect((await call('/admin/products/1',{method:'DELETE',admin:true,body:{}})).status).toBe(409);await sendEvent(approval);for(let i=0;i<2;i++)await json('/admin/orders/'+o.orderId,{method:'PATCH',admin:true,body:{status:'Cancelado'}});expect(await stock()).toBe(30);expect((await call('/admin/orders/'+o.orderId,{method:'PATCH',admin:true,body:{status:'Nuevo'}})).status).toBe(409);await sendEvent(approval);expect(await stock()).toBe(30);});
 it('conciliación API requiere referencia, importe exacto y token del comprador',async()=>{const o=await checkout();expect((await call('/bold/status',{method:'POST',body:{orderId:o.orderId,orderToken:'b'.repeat(48)}})).status).toBe(404);const fetch=vi.spyOn(globalThis,'fetch');fetch.mockResolvedValueOnce(Response.json({reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'verified-payment',total:649}));expect((await call('/bold/status',{method:'POST',body:o})).status).toBe(409);fetch.mockResolvedValueOnce(Response.json({reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'verified-payment',total:64900,currency:'COP'}));const confirmed=await json('/bold/status',{method:'POST',body:o});expect(confirmed.status).toBe('PAID');expect(confirmed.items).toEqual([{id:1,q:1}]);});
 it('dashboard, clientes y CSV solo incluyen aprobados',async()=>{const o=await checkout();await sendEvent(await event(o));await checkout();const year=new Date().getUTCFullYear();const dates=`?from=${year}-01-01&to=${year}-12-31`;const summary=await json('/admin/summary'+dates,{admin:true});expect(summary.soldOrders).toBe(1);expect(summary.sales).toBe(64900);const c=await json('/admin/customers'+dates,{admin:true});expect(c.customers).toHaveLength(1);expect(c.purchases).toBe(1);expect((await call('/admin/customers.csv'+dates,{admin:true})).headers.get('content-type')).toContain('text/csv');expect(await (await call('/admin/orders.csv',{admin:true})).text()).toContain(o.orderId);});
});
describe('Formatos monetarios de consulta Bold',()=>{
 for(const money of [{total:'64900.00',currency:'COP'},{total_amount:'64900',currency:'COP'},{amount:64900,currency:'COP'},{amount:{total_amount:'64900.00',currency:'COP'}}])it('concilia una representación exacta de pesos: '+JSON.stringify(money),async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'verified-format',...money}));
  const result=await json('/bold/status',{method:'POST',body:o});expect(result.status).toBe('PAID');expect(result.items).toEqual([{id:1,q:1}]);expect(await stock()).toBe(29);
 });
 it('un monto diferente no confirma; el diagnóstico detallado solo se devuelve al administrador',async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'wrong-amount',total:'649.00',currency:'COP',secret:'never-return-this',name:'private-customer'}));
  const denied=await call('/bold/status',{method:'POST',body:o});expect(denied.status).toBe(409);expect((await denied.json()).error).toBe('Importe o moneda inconsistente');
  const admin=await call('/admin/bold-payments/'+o.orderId+'/verify',{method:'POST',body:{},admin:true});expect(admin.status).toBe(409);const message=(await admin.json()).error;expect(message).toContain('Esperado: 64900 COP');expect(message).toContain('Recibido: 649');expect(message).not.toContain('never-return-this');expect(message).not.toContain('private-customer');expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PENDING');
 });
});
describe('Inventario protegido durante incertidumbre de pago',()=>{
 it('errores de Bold y paso del tiempo nunca devuelven la última unidad al catálogo',async()=>{
  await env.DB.prepare('UPDATE products SET stock=1 WHERE id=1').run();const o=await checkout();await env.DB.prepare("UPDATE bold_checkout_orders SET expires_at=datetime('now','-2 days')").run();
  vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('provider timeout'));await context(env).expireReservations();
  expect((await call('/admin/bold-payments/'+o.orderId+'/verify',{method:'POST',body:{},admin:true})).status).toBe(502);expect(await stock()).toBe(0);
  const row=await env.DB.prepare('SELECT status,stock_held,verification_error FROM bold_checkout_orders').first();expect(row).toEqual({status:'VERIFYING',stock_held:1,verification_error:'PROVIDER_UNAVAILABLE'});
  expect((await call('/bold/start',{method:'POST',body:payload(),headers:{'Idempotency-Key':'cannot-resell-held-unit'}})).status).toBe(409);
 });
 it('el cron sigue conciliando pagos antiguos y una aprobación conserva el descuento original',async()=>{
  const o=await checkout();await env.DB.prepare("UPDATE bold_checkout_orders SET created_at=datetime('now','-30 days'),expires_at=datetime('now','-29 days')").run();
  vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'old-approved',total:64900,currency:'COP'}));
  await worker.scheduled({},env);expect((await env.DB.prepare('SELECT status,stock_held FROM bold_checkout_orders').first())).toEqual({status:'PAID',stock_held:0});expect(await stock()).toBe(29);
 });
 it('D1 impide que una actualización libere una reserva no conciliada',async()=>{
  await checkout();await expect(env.DB.prepare('UPDATE bold_checkout_orders SET stock_held=0').run()).rejects.toThrow('UNVERIFIED_STOCK_MUST_STAY_RESERVED');expect(await stock()).toBe(29);
 });
 it('el administrador ve errores técnicos concretos sin revelar credenciales',async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('',{status:503}));
  const r=await call('/admin/bold-payments/'+o.orderId+'/verify',{method:'POST',body:{},admin:true});expect(r.status).toBe(502);expect((await r.json()).error).toBe('Bold rechazó la consulta. HTTP 503');expect(await stock()).toBe(29);
 });
});
describe('Comprobante Bold que no incluye moneda',()=>{
 it('reconcilia la estructura observada con los 119900 COP firmados del checkout',async()=>{
  const o=await checkout({...payload(),items:[{id:6,q:1}]});expect(o.currency).toBe('COP');expect(o.amount).toBe('119900');await env.DB.prepare("UPDATE bold_checkout_orders SET expires_at=datetime('now','-1 hour') WHERE id=?").bind(o.orderId).run();await context(env).expireReservations();
  vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({link_id:'fixture-link',total:119900,subtotal:119900,description:'Fixture purchase',reference_id:o.orderId,payment_status:'APPROVED',transaction_id:'voucher-no-currency',payer_email:'fixture@example.test',transaction_date:'2026-10-30',payment_method:'CARD',transaction_long_date:'fixture'}));
  const confirmed=await json('/bold/status',{method:'POST',body:o});expect(confirmed.status).toBe('PAID');expect(confirmed.items).toEqual([{id:6,q:1}]);const row=await env.DB.prepare('SELECT checkout_currency,verified_currency_source FROM bold_checkout_orders WHERE id=?').bind(o.orderId).first();expect(row).toEqual({checkout_currency:'COP',verified_currency_source:'SIGNED_CHECKOUT'});expect((await env.DB.prepare('SELECT stock FROM products WHERE id=6').first()).stock).toBe(14);
 });
 it('no acepta un importe distinto aunque el comprobante omita moneda',async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,total:649,payment_status:'APPROVED',transaction_id:'wrong-total-no-currency'}));expect((await call('/bold/status',{method:'POST',body:o})).status).toBe(409);expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PENDING');
 });
 it('no acepta otra referencia aunque el importe coincida y falte moneda',async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:'BC-'+'F'.repeat(20),total:64900,payment_status:'APPROVED',transaction_id:'wrong-ref-no-currency'}));expect((await call('/bold/status',{method:'POST',body:o})).status).toBe(409);
 });
 it('rechaza moneda explícita incompatible aunque el checkout sea COP',async()=>{
  const o=await checkout();vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,total:64900,currency:'USD',payment_status:'APPROVED',transaction_id:'wrong-explicit-currency'}));expect((await call('/bold/status',{method:'POST',body:o})).status).toBe(409);expect(await stock()).toBe(29);
 });
 it('D1 impide cambiar los datos que se firmaron al iniciar la compra',async()=>{
  await checkout();await expect(env.DB.prepare('UPDATE bold_checkout_orders SET total=1').run()).rejects.toThrow('SIGNED_CHECKOUT_IS_IMMUTABLE');expect((await env.DB.prepare('SELECT total,checkout_currency FROM bold_checkout_orders').first())).toEqual({total:64900,checkout_currency:'COP'});
 });
});
describe('Devolución de stock por rechazo confirmado',()=>{
 function rejectVoucher(o,overrides={}){vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({reference_id:o.orderId,total:Number(o.amount),payment_status:'REJECTED',transaction_id:'confirmed-rejection',...overrides}));}
 it('devuelve la unidad al consultar un rechazo con referencia e importe válidos',async()=>{
  const o=await checkout();rejectVoucher(o);const result=await json('/bold/status',{method:'POST',body:o});expect(result.status).toBe('REJECTED');expect(result.rejectionConfirmed).toBe(true);expect(result.stockReleased).toBe(true);expect(await stock()).toBe(30);expect((await env.DB.prepare('SELECT COUNT(*) n FROM orders').first()).n).toBe(0);expect((await env.DB.prepare('SELECT COUNT(*) n FROM bold_inventory_events').first()).n).toBe(1);
 });
 it('devuelve las cantidades exactas de cada producto de un carrito múltiple',async()=>{
  const o=await checkout({...payload(),items:[{id:1,q:2},{id:2,q:3}]});expect(await stock()).toBe(28);expect((await env.DB.prepare('SELECT stock FROM products WHERE id=2').first()).stock).toBe(15);rejectVoucher(o);await json('/bold/status',{method:'POST',body:o});expect(await stock()).toBe(30);expect((await env.DB.prepare('SELECT stock FROM products WHERE id=2').first()).stock).toBe(18);
 });
 it('consultas repetidas y concurrentes no devuelven el stock dos veces',async()=>{
  const o=await checkout();rejectVoucher(o);const responses=await Promise.all([call('/bold/status',{method:'POST',body:o}),call('/bold/status',{method:'POST',body:o})]);expect(responses.map(r=>r.status)).toEqual([200,200]);await json('/bold/status',{method:'POST',body:o});expect(await stock()).toBe(30);expect((await env.DB.prepare('SELECT COUNT(*) n FROM bold_inventory_events').first()).n).toBe(1);
 });
 it('un webhook de rechazo aislado conserva la reserva hasta la consulta autenticada',async()=>{
  const o=await checkout();await sendEvent(await event(o,{type:'SALE_REJECTED'}));expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT rejection_confirmed FROM bold_checkout_orders').first()).rejection_confirmed).toBe(0);rejectVoucher(o);const result=await json('/admin/bold-payments/'+o.orderId+'/verify',{method:'POST',body:{},admin:true});expect(result.stockReleased).toBe(true);expect(await stock()).toBe(30);
 });
 it('un rechazo sin identificador de transacción no libera inventario',async()=>{
  const o=await checkout();rejectVoucher(o,{transaction_id:''});expect((await call('/bold/status',{method:'POST',body:o})).status).toBe(400);expect(await stock()).toBe(29);
 });
 it('un rechazo posterior no modifica una venta ya aprobada',async()=>{
  const o=await checkout();await sendEvent(await event(o));rejectVoucher(o);const row=await env.DB.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').bind(o.orderId).first();await context(env).payments.verify(row);expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('PAID');expect(await stock()).toBe(29);expect((await env.DB.prepare('SELECT COUNT(*) n FROM bold_inventory_events').first()).n).toBe(0);
 });
 it('una aprobación contradictoria tardía requiere revisión si las unidades ya no están disponibles',async()=>{
  const o=await checkout();rejectVoucher(o);await json('/bold/status',{method:'POST',body:o});expect(await stock()).toBe(30);await env.DB.prepare('UPDATE products SET stock=0 WHERE id=1').run();await sendEvent(await event(o));expect((await env.DB.prepare('SELECT status FROM bold_checkout_orders').first()).status).toBe('REVIEW');expect(await stock()).toBe(0);
 });
});
