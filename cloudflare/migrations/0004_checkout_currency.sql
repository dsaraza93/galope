-- Both the original Galope checkout and the Worker sign
-- reference + integer total + literal COP + private key. Existing rows were
-- created by that COP-only flow; preserve this immutable checkout context.
ALTER TABLE bold_checkout_orders ADD COLUMN checkout_currency TEXT NOT NULL DEFAULT 'COP' CHECK(checkout_currency='COP');
ALTER TABLE bold_checkout_orders ADD COLUMN verified_currency_source TEXT NOT NULL DEFAULT '';
CREATE TRIGGER immutable_bold_checkout BEFORE UPDATE OF id,total,subtotal,shipping,items_json,checkout_currency ON bold_checkout_orders
WHEN NEW.id<>OLD.id OR NEW.total<>OLD.total OR NEW.subtotal<>OLD.subtotal OR NEW.shipping<>OLD.shipping OR NEW.items_json<>OLD.items_json OR NEW.checkout_currency<>OLD.checkout_currency BEGIN
 SELECT RAISE(ABORT,'SIGNED_CHECKOUT_IS_IMMUTABLE');
END;
