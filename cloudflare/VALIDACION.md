# Validación de Galope

- Pruebas funcionales del Worker sobre D1/R2: autenticación Google con JWT controlados, permisos, catálogo, productos, medios, pedidos, inventario, pagos simulados, campañas y CSV.
- Pruebas Node: importación, dinero, recuperación del carrito, configuración de despliegue y solicitudes JSON de borrar/cerrar sesión.
- Navegador Chromium contra Worker y base D1/R2 locales: entrada al administrador y reintento, ocho módulos, creación/edición/borrado de productos unisex con subida de fotos, alta de suscriptores, creación/borrado de campañas, persistencia y cierre de sesión. Recorridos a 390 y 1440 px.
- Inspección de la tienda, Club Galope y footer en móvil y escritorio.
- `npm run check`: compilación de Cloudflare sin publicación.

En la prueba de navegador solo se simula el botón externo de Google; las peticiones a la API, sesiones y almacenamiento local son reales. No se ha iniciado sesión con una cuenta real de Google durante estas pruebas. El origen HTTPS del negocio debe estar autorizado en Google Cloud para completar OAuth en producción. No se enviaron mensajes ni se hicieron cobros reales.

El recorrido `npm run test:admin` requiere un Worker en localhost:8791, datos de prueba y `ADMIN_TEST_COOKIE` correspondiente a una sesión creada exclusivamente en su D1 local. Rechaza hosts remotos para evitar cambios en producción.
