-- D1 statements and trigger effects are atomic; no application-side read/modify/write transactions.
ALTER TABLE bold_checkout_orders ADD COLUMN stock_held INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bold_checkout_orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE bold_checkout_orders ADD COLUMN request_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE bold_checkout_orders ADD COLUMN mode TEXT NOT NULL DEFAULT 'sandbox';
CREATE UNIQUE INDEX bold_start_idempotency ON bold_checkout_orders(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX bold_payment_once ON bold_checkout_orders(payment_id) WHERE payment_id<>'' AND status IN ('PAID','REVIEW');
CREATE TABLE rate_limits (key TEXT PRIMARY KEY,hits INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE migration_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE payment_audit (id INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT NOT NULL,old_status TEXT NOT NULL,new_status TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT(datetime('now')));
CREATE UNIQUE INDEX broadcast_open ON broadcast_batches(world,operation) WHERE confirmed_at IS NULL;
-- Hold inventory when a checkout is inserted, using the authoritative price and active status.
CREATE TRIGGER bold_hold_before BEFORE INSERT ON bold_checkout_orders WHEN NEW.status='PENDING' AND NEW.stock_held=0 BEGIN
 SELECT CASE WHEN json_array_length(NEW.items_json)=0 OR EXISTS(
 SELECT 1 FROM json_each(NEW.items_json) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.id')
 WHERE p.id IS NULL OR p.active<>1 OR p.price<>json_extract(j.value,'$.price') OR p.stock<json_extract(j.value,'$.q') OR json_extract(j.value,'$.q')<1
 ) THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
CREATE TRIGGER bold_hold_after AFTER INSERT ON bold_checkout_orders WHEN NEW.status='PENDING' AND NEW.stock_held=0 BEGIN
 UPDATE products SET stock=stock-(SELECT json_extract(j.value,'$.q') FROM json_each(NEW.items_json) j WHERE json_extract(j.value,'$.id')=products.id),updated_at=datetime('now')
 WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(NEW.items_json));
 UPDATE bold_checkout_orders SET stock_held=1 WHERE id=NEW.id;
END;
CREATE TRIGGER bold_release AFTER UPDATE OF status ON bold_checkout_orders
WHEN OLD.stock_held=1 AND NEW.status IN ('EXPIRED','REJECTED') AND OLD.status='PENDING' BEGIN
 UPDATE products SET stock=stock+(SELECT json_extract(j.value,'$.q') FROM json_each(OLD.items_json) j WHERE json_extract(j.value,'$.id')=products.id),updated_at=datetime('now')
 WHERE id IN(SELECT json_extract(value,'$.id') FROM json_each(OLD.items_json));
 UPDATE bold_checkout_orders SET stock_held=0 WHERE id=NEW.id;
END;
-- Late approvals need fresh stock; the application selects REVIEW if no longer available.
CREATE TRIGGER bold_late_before BEFORE UPDATE OF status ON bold_checkout_orders WHEN NEW.status='PAID' AND OLD.stock_held=0 AND OLD.status<>'PAID' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM json_each(OLD.items_json) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.id') WHERE p.id IS NULL OR p.stock<json_extract(j.value,'$.q')) THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
CREATE TRIGGER bold_paid AFTER UPDATE OF status ON bold_checkout_orders WHEN NEW.status='PAID' AND OLD.status<>'PAID' BEGIN
 UPDATE products SET stock=stock-(SELECT json_extract(j.value,'$.q') FROM json_each(NEW.items_json) j WHERE json_extract(j.value,'$.id')=products.id),updated_at=datetime('now')
 WHERE OLD.stock_held=0 AND id IN(SELECT json_extract(value,'$.id') FROM json_each(NEW.items_json));
 UPDATE bold_checkout_orders SET stock_held=0 WHERE id=NEW.id;
 INSERT INTO orders(id,created_at,name,tel,addr,pay_id,pay_name,subtotal,free_shipping,total,status,reservation_state)
 VALUES(NEW.id,NEW.created_at,NEW.name,NEW.tel,NEW.address,'bold','Bold',NEW.subtotal,CASE WHEN NEW.shipping=0 THEN 1 ELSE 0 END,NEW.total,'Nuevo','committed');
 INSERT INTO order_items(order_id,product_id,name,price,qty)
 SELECT NEW.id,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.price'),json_extract(value,'$.q') FROM json_each(NEW.items_json);
END;
CREATE TRIGGER bold_audit AFTER UPDATE OF status ON bold_checkout_orders WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO payment_audit(order_id,old_status,new_status) VALUES(NEW.id,OLD.status,NEW.status);
END;
CREATE TRIGGER bold_monotonic BEFORE UPDATE OF status ON bold_checkout_orders WHEN OLD.status IN('PAID','REVIEW') AND NEW.status<>OLD.status BEGIN
 SELECT RAISE(ABORT,'FINAL_PAYMENT_STATE');
END;
CREATE TRIGGER legacy_release AFTER UPDATE OF reservation_state ON orders WHEN OLD.reservation_state IN('committed','reserved') AND NEW.reservation_state IN('released','expired') BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT SUM(qty) FROM order_items WHERE order_id=NEW.id AND product_id=products.id),0),updated_at=datetime('now') WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id);
END;
CREATE TRIGGER protect_reserved_product BEFORE DELETE ON products WHEN EXISTS(
 SELECT 1 FROM bold_checkout_orders o,json_each(o.items_json) j WHERE o.stock_held=1 AND json_extract(j.value,'$.id')=OLD.id
) BEGIN SELECT RAISE(ABORT,'PRODUCT_RESERVED'); END;
ALTER TABLE bold_webhook_events ADD COLUMN payload_hash TEXT NOT NULL DEFAULT '';
CREATE TRIGGER legacy_cancel_final BEFORE UPDATE OF status ON orders WHEN OLD.status='Cancelado' AND NEW.status<>'Cancelado' BEGIN SELECT RAISE(ABORT,'CANCELLED_ORDER'); END;
ALTER TABLE bold_checkout_orders ADD COLUMN last_checked_at TEXT NOT NULL DEFAULT '';
