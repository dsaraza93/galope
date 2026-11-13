-- Requests are unpaid orders. Atomic triggers reserve stock and retain server prices.
CREATE TABLE pending_order_requests (
 id TEXT PRIMARY KEY,
 idempotency_key TEXT NOT NULL UNIQUE,
 request_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 tel TEXT NOT NULL,
 address TEXT NOT NULL,
 items_json TEXT NOT NULL,
 subtotal INTEGER NOT NULL CHECK(subtotal>=0)
);
CREATE TRIGGER pending_order_check BEFORE INSERT ON pending_order_requests BEGIN
 SELECT CASE WHEN json_array_length(NEW.items_json)=0 OR EXISTS (
 SELECT 1 FROM json_each(NEW.items_json) j LEFT JOIN products p ON p.id=json_extract(j.value,'$.id')
 WHERE p.id IS NULL OR p.active<>1 OR p.price<>json_extract(j.value,'$.price')
 OR p.stock<json_extract(j.value,'$.q') OR json_extract(j.value,'$.q')<1
 ) THEN RAISE(ABORT,'INVENTORY_CONFLICT') END;
END;
CREATE TRIGGER pending_order_create AFTER INSERT ON pending_order_requests BEGIN
 UPDATE products SET stock=stock-(SELECT json_extract(j.value,'$.q') FROM json_each(NEW.items_json) j WHERE json_extract(j.value,'$.id')=products.id),updated_at=datetime('now')
 WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(NEW.items_json));
 INSERT INTO orders(id,name,tel,addr,pay_id,pay_name,subtotal,free_shipping,total,reservation_state,reserved_until)
 VALUES(NEW.id,NEW.name,NEW.tel,NEW.address,'pending','Pendiente de pago',NEW.subtotal,0,NEW.subtotal,'reserved',datetime('now','+24 hours'));
 INSERT INTO order_items(order_id,product_id,name,price,qty)
 SELECT NEW.id,json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.price'),json_extract(value,'$.q') FROM json_each(NEW.items_json);
END;
