# Baby Center — Bold Botón personalizado (Sandbox)

## Implementación
Esta versión prepara el botón **Comprar** para abrir BoldCheckout y verificar la respuesta con la API oficial desde el backend Express. No cambia el diseño aprobado. **NO admite dinero real ni constituye integración de producción.** La confirmación mediante redirección jamás se toma como pago aprobado.

1. En `panel.bold.co` entra a **Integraciones → Llaves de integración → Botón de pagos** y activa las llaves si están disponibles.
2. Copia `.env.example` a `.env` y conserva además la configuración Google existente. Agrega `BOLD_MODE=sandbox`, `BOLD_TEST_API_KEY=...`, `BOLD_TEST_SECRET_KEY=...`. No subas `.env` ni publiques llaves privadas.
3. Ejecuta `npm install` y luego `npm start`.
4. Abre la tienda y completa un carrito de prueba. Pulsa **Comprar**. La pasarela debe señalar **Modo de pruebas**. Si no aparece esa marca, no continúes.
5. Al regresar al sitio, se consulta `POST /api/bold/status` usando el ID y token guardados en esa sesión de navegador. Si Bold devuelve `APPROVED` y el importe coincide, se descuenta inventario una sola vez; en caso contrario, el pago queda pendiente o rechazado.

## Restricciones / pendientes críticos
- **Cloudflare Worker + D1 + R2 aún no migrados:** esta versión continúa usando Express y SQLite local.
- El pedido de prueba se guarda en `bold_checkout_orders` para reconciliación. **Todavía no aparece en el listado administrativo estándar de `orders`**. Se debe enlazar para producción.
- En modo pruebas Bold no emite webhooks automáticos; su consola puede ofrecer la función "Probar webhook". El webhook autenticado de producción no está implementado.
- Una operación pendiente solo verifica su estado cuando el navegador consulta `/api/bold/status`. El estado nunca se deduce de parámetros de URL. La sesión pendiente está guardada en `sessionStorage`, por lo que cerrar el navegador puede impedir la consulta automática y requiere conciliación manual.
- Reservas de prueba expiran tras 15 minutos para disponibilidad preliminar; no reemplazan un sistema de conciliación y liberación robusto para producción. El stock se descuenta solo después de aprobación. **No usar en producción hasta probar concurrencia, reservas, anulaciones y pagos tardíos**.
- La firma SHA256 se genera en servidor usando referencia+importe+COP+llave secreta de prueba. La clave privada nunca llega al navegador.
- Addi sigue separado y no se conecta por Bold en este flujo.
- Si necesitas registrar comprador y factura electrónica de forma definitiva, valida los requisitos legales antes del lanzamiento.

## Referencias oficiales
https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual/integracion-personalizada
https://developers.bold.co/pagos-en-linea/boton-de-pagos/ambiente-pruebas
https://www.developers.bold.co/pagos-en-linea/consulta-de-transacciones
