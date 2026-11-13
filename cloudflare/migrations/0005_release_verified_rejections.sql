-- Return units only after the authenticated voucher query confirms a terminal
-- negative result with an identified transaction. A timer, transport error or
-- an individual webhook rejection cannot authorize this return.
ALTER TABLE bold_checkout_orders ADD COLUMN rejection_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(rejection_confirmed IN(0,1));
ALTER TABLE bold_checkout_orders ADD COLUMN confirmed_rejection_payment_id TEXT NOT NULL DEFAULT '';
ALTER TABLE bold_checkout_orders ADD COLUMN stock_released_at TEXT NOT NULL DEFAULT '';
CREATE TABLE bold_inventory_events(
 order_id TEXT PRIMARY KEY REFERENCES bold_checkout_orders(id),
 reason TEXT NOT NULL CHECK(reason='VERIFIED_REJECTION'),
 payment_id TEXT NOT NULL,
 items_json TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT(datetime('now'))
);
DROP TRIGGER protect_unverified_hold;
CREATE TRIGGER protect_unverified_hold BEFORE UPDATE OF stock_held ON bold_checkout_orders
WHEN OLD.stock_held=1 AND NEW.stock_held=0 AND NEW.status NOT IN('PAID','CLOSED_UNPAID')
AND NOT(NEW.status='REJECTED' AND NEW.rejection_confirmed=1 AND NEW.confirmed_rejection_payment_id<>'') BEGIN
 SELECT RAISE(ABORT,'UNVERIFIED_STOCK_MUST_STAY_RESERVED');
END;
CREATE TRIGGER release_verified_rejection AFTER UPDATE OF rejection_confirmed ON bold_checkout_orders
WHEN OLD.rejection_confirmed=0 AND NEW.rejection_confirmed=1 AND NEW.status='REJECTED' AND OLD.stock_held=1 AND NEW.confirmed_rejection_payment_id<>'' BEGIN
 INSERT INTO bold_inventory_events(order_id,reason,payment_id,items_json) VALUES(NEW.id,'VERIFIED_REJECTION',NEW.confirmed_rejection_payment_id,NEW.items_json);
 UPDATE products SET stock=stock+COALESCE((SELECT SUM(CAST(json_extract(j.value,'$.q') AS INTEGER)) FROM json_each(NEW.items_json) j WHERE json_extract(j.value,'$.id')=products.id),0),updated_at=datetime('now')
 WHERE id IN(SELECT json_extract(value,'$.id') FROM json_each(NEW.items_json));
 UPDATE bold_checkout_orders SET stock_held=0,stock_released_at=datetime('now'),reservation_alert='RELEASED_VERIFIED_REJECTION' WHERE id=NEW.id;
END;
CREATE TRIGGER keep_confirmed_rejection_closed BEFORE UPDATE OF status ON bold_checkout_orders
WHEN OLD.status='REJECTED' AND OLD.rejection_confirmed=1 AND NEW.status IN('PENDING','VERIFYING','EXPIRED') BEGIN
 SELECT RAISE(ABORT,'CONFIRMED_REJECTION_REQUIRES_NEW_CHECKOUT');
END;
