import {HttpError,v} from './http.js';
import {sha,randomHex} from './crypto.js';
export async function createPendingOrder(ctx,b,req){
 const {db}=ctx;
 if(ctx.payments.settings().enabled)throw new HttpError(409,'El pago en línea ya está disponible. Actualiza la tienda para continuar.');
 const name=v.str(b.name,'Nombre',{min:2,max:80});
 const tel=v.str(b.tel,'Celular',{min:7,max:20}).replace(/[^\d+]/g,'');
 if(!/^\+?\d{7,15}$/.test(tel))throw new HttpError(400,'Celular no válido');
 const fulfillment=v.oneOf(b.fulfillment,['pickup','delivery'],'Entrega');
 const s=await ctx.getSettings();
 const address=fulfillment==='pickup'?'Retiro en tienda · '+(s.shipping?.pickupAddress||'Coordinar con Galope'):v.str(b.addr,'Dirección',{min:5,max:250});
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>30)throw new HttpError(400,'Tu carrito está vacío o supera 30 productos diferentes');
 const key=String(req.get('idempotency-key')||'');
 if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))throw new HttpError(400,'Se requiere Idempotency-Key');
 const seen=new Set();
 const input=b.items.map(i=>{const id=v.int(i?.id,'Producto',{min:1}),q=v.int(i?.q,'Cantidad',{min:1,max:99});if(seen.has(id))throw new HttpError(400,'Producto repetido en el carrito');seen.add(id);return {id,q};}).sort((a,b)=>a.id-b.id);
 const hash=await sha(JSON.stringify({name,tel,address,fulfillment,items:input}));
 const replay=async row=>{
  if(row.request_hash!==hash)throw new HttpError(409,'Este intento corresponde a otro pedido. Actualiza e intenta de nuevo.');
  const order=await db.prepare('SELECT status,reserved_until FROM orders WHERE id=?').get(row.id);
  if(!order||order.status==='Cancelado')throw new HttpError(409,'La reserva de este pedido terminó. Inicia un nuevo pedido.');
  return {id:row.id,total:row.subtotal,status:order.status,paymentStatus:'PENDING',reservedUntil:order.reserved_until,items:JSON.parse(row.items_json).map(({id,q})=>({id,q}))};
 };
 const prior=await db.prepare('SELECT * FROM pending_order_requests WHERE idempotency_key=?').get(key);
 if(prior)return replay(prior);
 let subtotal=0;const lines=[];
 for(const item of input){
  const p=await db.prepare('SELECT id,name,price,stock FROM products WHERE id=? AND active=1').get(item.id);
  if(!p||p.stock<item.q)throw new HttpError(409,p?`De «${p.name}» solo quedan ${p.stock} unidades`:'Un producto ya no está disponible');
  lines.push({...item,name:p.name,price:p.price});subtotal+=p.price*item.q;
 }
 if(!Number.isSafeInteger(subtotal)||subtotal<1)throw new HttpError(400,'Importe no válido');
 const id='GAL-'+randomHex(10).toUpperCase();
 try{await db.prepare('INSERT INTO pending_order_requests(id,idempotency_key,request_hash,name,tel,address,items_json,subtotal) VALUES(?,?,?,?,?,?,?,?)').run(id,key,hash,name,tel,address,JSON.stringify(lines),subtotal);}
 catch(error){
  const existing=await db.prepare('SELECT * FROM pending_order_requests WHERE idempotency_key=?').get(key);if(existing)return replay(existing);
  if(String(error).includes('INVENTORY_CONFLICT'))throw new HttpError(409,'El inventario cambió. Revisa las cantidades de tu carrito.');throw error;
 }
 return replay(await db.prepare('SELECT * FROM pending_order_requests WHERE id=?').get(id));
}
