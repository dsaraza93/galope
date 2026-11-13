-- A local deadline or a failed verification is not evidence that a customer did not pay.
-- Never release Bold inventory automatically, including on an individual rejection:
-- a checkout may still have another payment attempt in flight.
ALTER TABLE bold_checkout_orders ADD COLUMN reservation_alert TEXT NOT NULL DEFAULT '';
ALTER TABLE bold_checkout_orders ADD COLUMN verification_error TEXT NOT NULL DEFAULT '';
ALTER TABLE bold_checkout_orders ADD COLUMN last_verified_at TEXT NOT NULL DEFAULT '';
DROP TRIGGER bold_release;
CREATE TRIGGER protect_unverified_hold BEFORE UPDATE OF stock_held ON bold_checkout_orders
WHEN OLD.stock_held=1 AND NEW.stock_held=0 AND NEW.status NOT IN ('PAID','CLOSED_UNPAID') BEGIN
 SELECT RAISE(ABORT,'UNVERIFIED_STOCK_MUST_STAY_RESERVED');
END;
-- The old expiry policy may already have released stock. Recover it atomically
-- only if still available; otherwise flag the conflict rather than invent units.
CREATE TRIGGER recover_legacy_hold AFTER UPDATE OF status ON bold_checkout_orders
WHEN NEW.status='VERIFYING' AND OLD.status IN ('EXPIRED','REJECTED') AND OLD.stock_held=0 BEGIN
 UPDATE bold_checkout_orders SET stock_held=CASE WHEN NOT EXISTS(
  SELECT 1 FROM json_each(NEW.items_json) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.id')
  WHERE p.id IS NULL OR p.stock<json_extract(j.value,'$.q')
 ) THEN 1 ELSE 0 END WHERE id=NEW.id;
 UPDATE products SET stock=stock-(SELECT json_extract(j.value,'$.q') FROM json_each(NEW.items_json) j WHERE json_extract(j.value,'$.id')=products.id),updated_at=datetime('now')
 WHERE (SELECT stock_held FROM bold_checkout_orders WHERE id=NEW.id)=1
 AND id IN(SELECT json_extract(value,'$.id') FROM json_each(NEW.items_json));
 UPDATE bold_checkout_orders SET reservation_alert=CASE WHEN stock_held=1 THEN 'LEGACY_HOLD_RESTORED' ELSE 'STOCK_REVIEW_REQUIRED' END WHERE id=NEW.id;
END;
UPDATE bold_checkout_orders SET status='VERIFYING'
WHERE status IN('EXPIRED','REJECTED') AND stock_held=0;
UPDATE bold_checkout_orders SET status='VERIFYING',reservation_alert='AWAITING_PAYMENT_VERIFICATION'
WHERE status='PENDING' AND expires_at<=datetime('now');
UPDATE bold_checkout_orders SET payment_status='' WHERE status='VERIFYING' AND payment_status='RESERVATION_EXPIRED';
-- No automatic release endpoint is exposed. CLOSED_UNPAID is reserved for an
-- audited operational reconciliation after the gateway is proven unable to charge.
