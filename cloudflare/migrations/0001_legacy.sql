PRAGMA foreign_keys = ON;
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  cat         TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  old_price   INTEGER NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  badge       TEXT NOT NULL DEFAULT '',
  emoji       TEXT NOT NULL DEFAULT '🤠',
  description TEXT NOT NULL DEFAULT '',
  feats       TEXT NOT NULL DEFAULT '[]',
  imgs        TEXT NOT NULL DEFAULT '[]',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
, world TEXT NOT NULL DEFAULT 'hombre', age_min INTEGER NOT NULL DEFAULT 0, age_max INTEGER NOT NULL DEFAULT 36, categories TEXT NOT NULL DEFAULT '[]');
CREATE TABLE orders (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  name          TEXT NOT NULL,
  tel           TEXT NOT NULL,
  addr          TEXT NOT NULL,
  pay_id        TEXT NOT NULL,
  pay_name      TEXT NOT NULL,
  subtotal      INTEGER NOT NULL,
  free_shipping INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Nuevo'
, reservation_state TEXT NOT NULL DEFAULT 'committed', reserved_until TEXT NOT NULL DEFAULT '', delivered_at TEXT NOT NULL DEFAULT '');
CREATE TABLE order_items (
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  name       TEXT NOT NULL,
  price      INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK (qty > 0)
);
CREATE TABLE slides (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  pos    INTEGER NOT NULL,
  tag    TEXT NOT NULL DEFAULT '',
  title  TEXT NOT NULL DEFAULT '',
  sub    TEXT NOT NULL DEFAULT '',
  off    TEXT NOT NULL DEFAULT '',
  cta    TEXT NOT NULL DEFAULT '',
  cat    TEXT NOT NULL DEFAULT '',
  bg     TEXT NOT NULL DEFAULT 'blush',
  img    TEXT NOT NULL DEFAULT '',
  seal   TEXT NOT NULL DEFAULT '',
  timer  INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
, custom_image TEXT NOT NULL DEFAULT '', text_theme TEXT NOT NULL DEFAULT 'claro', timer_end TEXT NOT NULL DEFAULT '');
CREATE TABLE subscribers (
  tel        TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, interest TEXT NOT NULL DEFAULT 'ambos', consent INTEGER NOT NULL DEFAULT 0, consent_at TEXT, consent_source TEXT NOT NULL DEFAULT 'legacy', status TEXT NOT NULL DEFAULT 'pending', updated_at TEXT, name TEXT NOT NULL DEFAULT '');
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL
);
CREATE TABLE broadcast_members (
  tel TEXT NOT NULL, world TEXT NOT NULL CHECK(world IN ('hombre','mujer')),
  confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(tel, world)
);
CREATE TABLE broadcast_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  world TEXT NOT NULL, operation TEXT NOT NULL,
  contacts_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at TEXT
);
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'todos',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  media_url TEXT NOT NULL DEFAULT '',
  media_kind TEXT NOT NULL DEFAULT '',
  media_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE bold_checkout_orders (

  id TEXT PRIMARY KEY,

  access_token_hash TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),

  expires_at TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING',

  name TEXT NOT NULL,

  tel TEXT NOT NULL,

  document_type TEXT NOT NULL,

  document_number TEXT NOT NULL,

  address TEXT NOT NULL,

  fulfillment TEXT NOT NULL,

  items_json TEXT NOT NULL,

  subtotal INTEGER NOT NULL,

  shipping INTEGER NOT NULL,

  total INTEGER NOT NULL,

  payment_id TEXT NOT NULL DEFAULT '',

  payment_status TEXT NOT NULL DEFAULT ''

);
CREATE TABLE bold_webhook_events (
  event_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_items_order ON order_items(order_id);
CREATE INDEX idx_order_reservation ON orders(reservation_state,status,reserved_until);
CREATE INDEX idx_orders_delivered ON orders(status,delivered_at);
CREATE INDEX idx_bold_pending ON bold_checkout_orders(status,expires_at);
