import {HttpError} from './http.js';
import {readBoldVoucherMoney,moneyError} from './bold-money.js';
import {sha,hmac,randomHex,constantEqual,base64} from './crypto.js';
export function payments(ctx){
 const {db,env,getSettings}=ctx;
 const mode=env.BOLD_MODE==='production'?'production':'sandbox';
 const apiKey=mode==='sandbox'?env.BOLD_TEST_API_KEY:env.BOLD_LIVE_API_KEY;
 const secret=mode==='sandbox'?env.BOLD_TEST_SECRET_KEY:env.BOLD_LIVE_SECRET_KEY;
 // A separate, explicit verification attestation is required. Deployment alone never enables live charges.
 const enabled=Boolean(apiKey&&secret)&&(mode==='sandbox'||(env.BOLD_PRODUCTION_VERIFIED==='yes'&&env.BOLD_ENABLE_LIVE_PAYMENTS==='yes'));
 const settings=()=>({enabled,mode});
 async function start(b,req){
  if(!enabled)throw new HttpError(503,'El pago en línea no está disponible todavía.');
  const name=String(b.name||'').trim(),tel=String(b.tel||'').trim(),doc=String(b.documentNumber||'').trim(),docType=b.documentType;
  if(name.length<2||name.length>80||!/^\+?\d{7,15}$/.test(tel)||!['CC','CE','PA','NIT','TI'].includes(docType)||!/^[a-zA-Z0-9-]{5,20}$/.test(doc))throw new HttpError(400,'Verifica tus datos personales');
  if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)throw new HttpError(400,'Carrito no válido');
  const key=String(req.get('idempotency-key')||'');
  if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))throw new HttpError(400,'Se requiere Idempotency-Key');
  const requestHash=await sha(JSON.stringify({name,tel,doc,docType,fulfillment:b.fulfillment,addr:b.addr,items:b.items}));
  // Derive the bearer token from a high-entropy client key and a server secret, so retries are stable without storing plaintext tokens.
  const token=(await hmac(secret,'checkout-token:'+key)).slice(0,48);
  const prior=await db.prepare('SELECT * FROM bold_checkout_orders WHERE idempotency_key=?').get(key);
  if(prior)return replay(prior,requestHash,token);
  const s=await getSettings(),ship=s.shipping||{};
  if(!['pickup','delivery'].includes(b.fulfillment))throw new HttpError(400,'Selecciona un método de entrega válido');
  const fulfillment=b.fulfillment;
  // Ambos métodos están habilitados. El transporte se cotiza y paga por separado.
  const address=fulfillment==='pickup'?String(ship.pickupAddress||'Retiro en tienda'):String(b.addr||'').trim();
  if(address.length<5||address.length>250)throw new HttpError(400,'Ingresa una dirección válida');
  const seen=new Set(),items=[];let subtotal=0;
  for(const i of b.items){const id=Number(i.id),q=Number(i.q);if(!Number.isSafeInteger(id)||id<1||!Number.isSafeInteger(q)||q<1||q>99||seen.has(id))throw new HttpError(400,'Producto o cantidad no válida');seen.add(id);
   const p=await db.prepare('SELECT id,name,price,stock FROM products WHERE id=? AND active=1').get(id);if(!p||p.stock<q)throw new HttpError(409,'No hay unidades disponibles');
   items.push({id,q,name:p.name,price:p.price});subtotal+=p.price*q;
  }
  // El transporte se cotiza y paga por separado tras la confirmación y aceptación del comprador.
  const shipping=0,total=subtotal;
  if(!Number.isSafeInteger(total)||total<1000||!Number.isSafeInteger(shipping)||shipping<0)throw new HttpError(400,'Importe no válido');
  const id='BC-'+randomHex(10).toUpperCase();
  try{await db.prepare(`INSERT INTO bold_checkout_orders(id,access_token_hash,expires_at,name,tel,document_type,document_number,address,fulfillment,items_json,subtotal,shipping,total,idempotency_key,request_hash,mode) VALUES(?,?,datetime('now','+15 minutes'),?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,await sha(token),name,tel,docType,doc,address,fulfillment,JSON.stringify(items),subtotal,shipping,total,key,requestHash,mode);}catch(e){
   const existing=await db.prepare('SELECT * FROM bold_checkout_orders WHERE idempotency_key=?').get(key);if(existing)return replay(existing,requestHash,token);if(String(e).includes('INVENTORY_CONFLICT'))throw new HttpError(409,'El inventario cambió. Actualiza tu carrito.');throw e;
  }
  return response({id,total},token);
 }
 async function replay(row,hash,token){if(row.request_hash!==hash||row.mode!==mode||row.access_token_hash!==await sha(token))throw new HttpError(409,'Clave de idempotencia ya utilizada');if(row.status!=='PENDING'||Date.parse(row.expires_at.replace(' ','T')+'Z')<=Date.now())throw new HttpError(409,'Este intento terminó. Inicia una nueva compra.');return response(row,token);}
 async function response(row,token){return {orderId:row.id,orderToken:token,currency:'COP',amount:String(row.total),apiKey,integritySignature:await sha(`${row.id}${row.total}COP${secret}`),description:'Compra Galope '+row.id,mode};}
 async function apply(orderId,status,paymentId,amount,currency,event,{source}={}){
  if(!['APPROVED','REJECTED','FAILED','VOIDED','PROCESSING','PENDING'].includes(status))throw new HttpError(400,'Estado Bold no reconocido');
  const row=await db.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').get(orderId);
  if(!row)throw new HttpError(404,'Pedido no encontrado');
  if(row.mode!==mode)throw new HttpError(409,'Entorno de pago inconsistente');
  if(currency!=='COP'||!Number.isSafeInteger(amount)||row.total!==amount)throw new HttpError(409,'Importe o moneda inconsistente');
  const pid=String(paymentId||'');if(status==='APPROVED'&&(!pid||pid.length>150))throw new HttpError(400,'Identificador de pago requerido');
  const verifiedRejection=source==='BOLD_VOUCHER_API'&&['REJECTED','FAILED','VOIDED'].includes(status);
  if(verifiedRejection&&(!pid.trim()||pid.length>150))throw new HttpError(400,'Falta el identificador de la transacción rechazada');
  if(status==='APPROVED'&&row.status==='PAID'&&row.payment_id!==pid)throw new HttpError(409,'Se recibió otro pago para un pedido ya pagado. Requiere conciliación manual.');
  const statements=[];
  if(event)statements.push(db.native.prepare('INSERT INTO bold_webhook_events(event_id,order_id,event_type,payload_hash) VALUES(?,?,?,?)').bind(event.id,orderId,event.type,event.hash));
  if(status==='APPROVED'){
   statements.push(db.native.prepare(`UPDATE bold_checkout_orders SET status=CASE WHEN stock_held=0 AND EXISTS(SELECT 1 FROM json_each(items_json) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.id') WHERE p.id IS NULL OR p.stock<json_extract(j.value,'$.q')) THEN 'REVIEW' ELSE 'PAID' END,payment_id=?,payment_status='APPROVED' WHERE id=? AND status NOT IN('PAID','REVIEW')`).bind(pid,orderId));
  }else if(['REJECTED','FAILED','VOIDED'].includes(status)){
   statements.push(db.native.prepare("UPDATE bold_checkout_orders SET status='REJECTED',payment_status=?,payment_id=?,rejection_confirmed=CASE WHEN ?=1 THEN 1 ELSE rejection_confirmed END,confirmed_rejection_payment_id=CASE WHEN ?=1 THEN ? ELSE confirmed_rejection_payment_id END WHERE id=? AND status IN('PENDING','VERIFYING','EXPIRED','REJECTED') AND (rejection_confirmed=0 OR ?=1)").bind(status,pid,verifiedRejection?1:0,verifiedRejection?1:0,pid,orderId,verifiedRejection?1:0));
  }else statements.push(db.native.prepare("UPDATE bold_checkout_orders SET payment_status=? WHERE id=? AND status IN('PENDING','VERIFYING','EXPIRED')").bind(status,orderId));
  try{await db.native.batch(statements);}catch(e){
   if(event){const old=await db.prepare('SELECT * FROM bold_webhook_events WHERE event_id=?').get(event.id);if(old){if(old.payload_hash&&old.payload_hash!==event.hash)throw new HttpError(409,'Evento duplicado con contenido diferente');return {status:(await db.prepare('SELECT status FROM bold_checkout_orders WHERE id=?').get(orderId)).status,duplicate:true};}}
   if(String(e).includes('bold_payment_once')||String(e).includes('payment_id'))throw new HttpError(409,'Pago ya asociado a otro pedido');throw e;
  }
  return {status:(await db.prepare('SELECT status FROM bold_checkout_orders WHERE id=?').get(orderId)).status};
 }
 async function verify(row,{diagnostics=false}={}){
  if(!enabled||row.mode!==mode)throw new HttpError(503,'Conciliación no configurada para este entorno');
  await db.prepare("UPDATE bold_checkout_orders SET last_checked_at=datetime('now') WHERE id=?").run(row.id);
  try {
  let r;try{r=await fetch('https://payments.api.bold.co/v2/payment-voucher/'+encodeURIComponent(row.id),{headers:{Authorization:'x-api-key '+apiKey,Accept:'application/json'},signal:AbortSignal.timeout(10000)});}catch{throw new HttpError(502,'No fue posible conectar con Bold');}
  if(!r.ok)throw new HttpError(502,'Bold rechazó la consulta. HTTP '+r.status);
  const p=await r.json();if(p.reference_id!==row.id)throw new HttpError(409,'Referencia de pago inconsistente');
  const money=readBoldVoucherMoney(p,row.checkout_currency);
  if(money.amount===null||money.currency!=='COP'||money.amount!==row.total)throw new HttpError(409,diagnostics?moneyError(row.total,money):'Importe o moneda inconsistente');
  const result=await apply(row.id,String(p.payment_status||'').toUpperCase(),p.transaction_id||p.payment_id,money.amount,money.currency,undefined,{source:'BOLD_VOUCHER_API'});
  await db.prepare("UPDATE bold_checkout_orders SET verification_error='',last_verified_at=datetime('now'),verified_currency_source=? WHERE id=?").run(money.currencySource,row.id);
  return result;
  } catch(error) {
   const code=(error.status===409||error.status===400)?'PAYMENT_DATA_MISMATCH':error.status===503?'VERIFICATION_NOT_CONFIGURED':'PROVIDER_UNAVAILABLE';
   try { await db.prepare('UPDATE bold_checkout_orders SET verification_error=? WHERE id=?').run(code,row.id); } catch {}
   throw error;
  }
 }
 async function status(b){const id=String(b.orderId||''),token=String(b.orderToken||'');const row=await db.prepare('SELECT * FROM bold_checkout_orders WHERE id=?').get(id);if(!row||!/^[a-f0-9]{48}$/.test(token)||!constantEqual(await sha(token),row.access_token_hash))throw new HttpError(404,'Pedido no encontrado');if(['PENDING','VERIFYING','EXPIRED','REJECTED'].includes(row.status)&&enabled)await verify(row);const now=await db.prepare('SELECT status,payment_status,rejection_confirmed,stock_held FROM bold_checkout_orders WHERE id=?').get(id);return {orderId:id,status:now.status,paymentStatus:now.payment_status||'PROCESSING',rejectionConfirmed:now.status==='REJECTED'&&!!now.rejection_confirmed,stockReleased:now.status==='REJECTED'&&!!now.rejection_confirmed&&!now.stock_held,...(now.status==='PAID'?{items:JSON.parse(row.items_json).map(({id,q})=>({id,q}))}:{})};}
 async function webhook(req){
  if(!env.BOLD_WEBHOOK_SECRET)throw new HttpError(503,'Webhook no configurado');
  if(!req.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HttpError(415,'Se requiere JSON');
  const bytes=await req.raw.arrayBuffer();if(bytes.byteLength>65536)throw new HttpError(413,'Evento demasiado grande');
  const sig=String(req.get('x-bold-signature')||'').trim().toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(sig)||!constantEqual(sig,await hmac(env.BOLD_WEBHOOK_SECRET,base64(bytes))))throw new HttpError(401,'Firma incorrecta');
  let e;try{e=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError(400,'JSON inválido');}
  const id=String(e.id||''),type=String(e.type||''),orderId=String(e.data?.metadata?.reference||'');
  if(!id||id.length>150||!/^BC-[A-F0-9]{20}$/.test(orderId))throw new HttpError(400,'Evento o referencia inválidos');
  if(!['SALE_APPROVED','SALE_REJECTED'].includes(type))return {ok:true,ignored:true};
  const hash=await sha(base64(bytes)),old=await db.prepare('SELECT * FROM bold_webhook_events WHERE event_id=?').get(id);
  if(old){if(old.payload_hash&&old.payload_hash!==hash)throw new HttpError(409,'Evento duplicado con contenido diferente');return {ok:true,duplicate:true};}
  const result=await apply(orderId,type==='SALE_APPROVED'?'APPROVED':'REJECTED',e.data.payment_id||e.subject,e.data.amount?.total,e.data.amount?.currency,{id,type,hash});return {ok:true,...result};
 }
 return {settings,start,apply,verify,status,webhook};
}
