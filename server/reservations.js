'use strict';
const { db } = require('./db');
const cfg = require('./config');
// Stock en products.stock = unidades libres para comprar. Una reserva resta stock
// una sola vez; confirmar convierte reserva en venta, sin volver a restar.
const expireReservations = db.transaction(() => {
  const expired = db.prepare("SELECT id FROM orders WHERE reservation_state='reserved' AND status='Nuevo' AND reserved_until <= datetime('now')").all();
  const items = db.prepare('SELECT product_id, qty FROM order_items WHERE order_id=?');
  const restore = db.prepare("UPDATE products SET stock=stock+?,updated_at=datetime('now') WHERE id=?");
  const cancel = db.prepare("UPDATE orders SET status='Cancelado',reservation_state='expired' WHERE id=? AND reservation_state='reserved'");
  for (const o of expired) {
    if (cancel.run(o.id).changes === 1) items.all(o.id).forEach(i => restore.run(i.qty, i.product_id));
  }
  return expired.length;
});
module.exports = { expireReservations };
