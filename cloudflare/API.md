# API conservada

Las rutas siguientes conservan sus cuerpos/respuestas de la tienda original salvo las restricciones documentadas de pagos y Addi. `/api/admin/*` exige sesión Google. Todas las escrituras, excepto el webhook, exigen `X-Requested-With: galope` y un origen del mismo sitio.

| Método | Ruta |
| --- | --- |
| GET | `/api/admin/summary` |
| GET | `/api/admin/bold-payments` |
| GET | `/api/admin/customers` |
| GET | `/api/admin/customers.csv` |
| POST | `/api/admin/bold-payments/:id/verify` |
| GET | `/api/admin/products` |
| POST | `/api/admin/products` |
| PUT | `/api/admin/products/:id` |
| DELETE | `/api/admin/products/:id` |
| POST | `/api/admin/uploads` |
| POST | `/api/admin/campaign-media` |
| GET | `/api/admin/orders` |
| PATCH | `/api/admin/orders/:id` |
| GET | `/api/admin/orders.csv` |
| GET | `/api/admin/slides` |
| PUT | `/api/admin/slides/:id` |
| GET | `/api/admin/side-promos` |
| PUT | `/api/admin/side-promos/:index` |
| GET | `/api/admin/settings` |
| PUT | `/api/admin/settings` |
| GET | `/api/admin/broadcast/summary` |
| POST | `/api/admin/broadcast/batches` |
| GET | `/api/admin/broadcast/batches/:id.csv` |
| POST | `/api/admin/broadcast/batches/:id/confirm` |
| GET | `/api/admin/subscribers` |
| PATCH | `/api/admin/subscribers/:tel` |
| DELETE | `/api/admin/subscribers/:tel` |
| GET | `/api/admin/messaging/status` |
| GET | `/api/admin/campaigns/:id/preview` |
| POST | `/api/admin/campaigns/:id/send` |
| GET | `/api/admin/campaigns` |
| POST | `/api/admin/campaigns` |
| DELETE | `/api/admin/campaigns/:id` |
| GET | `/api/admin/campaigns/:id/audience.csv` |
| GET | `/api/store` |
| POST | `/api/orders` |
| POST | `/api/subscribe` |
| GET | `/api/bold/config` |
| POST | `/api/bold/start` |
| POST | `/api/bold/status` |
| GET | `/api/addi/status` |
| GET | `/api/addi/eligibility` |
| GET | `/api/auth/status` |
| POST | `/api/auth/google` |
| POST | `/api/auth/logout` |
| POST | `/api/bold/webhook` |

`POST /api/orders` continúa bloqueado: el flujo seguro es `/api/bold/start` y conciliación. Addi conserva la ruta pero no consulta ni inicia financiación. Sistecrédito no tiene endpoint de cobro. Las llamadas de actualización siguen los mismos límites de campos y validadores.

`POST /api/bold/status` devuelve, únicamente al confirmar `PAID`, `items: [{id,q}]` de ese pedido autenticado. El cliente usa ese detalle verificado para retirar las unidades compradas; no toma la redirección ni mensajes del modal como comprobante de pago.
