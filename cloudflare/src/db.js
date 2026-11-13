export function database(native){
 return {native,prepare(sql){return {
  get:async(...args)=>(await native.prepare(sql).bind(...args).first())||undefined,
  all:async(...args)=>(await native.prepare(sql).bind(...args).all()).results,
  run:async(...args)=>{const r=await native.prepare(sql).bind(...args).run();return {changes:r.meta.changes,lastInsertRowid:r.meta.last_row_id};}
 };}};
}
export async function expireReservations(db){
 await db.native.batch([
  db.native.prepare("UPDATE bold_checkout_orders SET status='VERIFYING',reservation_alert='AWAITING_PAYMENT_VERIFICATION' WHERE status='PENDING' AND expires_at<=datetime('now')"),
  db.native.prepare("UPDATE orders SET status='Cancelado',reservation_state='expired' WHERE reservation_state='reserved' AND status='Nuevo' AND reserved_until<=datetime('now')"),
  db.native.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
  db.native.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now())
 ]);
}
