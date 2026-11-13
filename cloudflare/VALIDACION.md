# Validación de Galope

## Ejecutado en esta adaptación

- `npm ci`: instalación reproducible con Node 24.
- `npm test`: pruebas del Worker sobre D1/R2, OAuth, permisos, productos, banners, campañas, reservas, rechazos, conciliación, inventario y CSV; pruebas Node de importación, importes y recuperación del carrito.
- Pruebas específicas de Galope: instalación limpia con 12 ejemplos, WhatsApp correcto, cero pedidos/sesiones heredadas, stock cero, cinco banners ocultos y filtrado hombre/mujer/unisex/ofertas.
- `npm run check`: bundle de Cloudflare compilado sin publicar.

No se ejecutaron cobros, envíos de campañas, migraciones remotas ni despliegues. No se completó una revisión visual en navegador en este entorno. Las pruebas de UI incluidas ejecutan JavaScript y verifican la lógica; no sustituyen la revisión visual antes del lanzamiento. Los recorridos opcionales en `tests-browser/` proceden del origen y necesitan un entorno con navegador y catálogo de prueba compatible.
