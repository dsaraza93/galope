# Migración a compras con Bold — estado seguro

- El carrito presenta **Comprar** y deja de abrir WhatsApp.
- El resumen comercial no muestra el indicador de pendientes.
- La creación de nuevos pedidos desde el checkout público queda bloqueada hasta conectar Bold. No se cobra ni se reserva inventario engañosamente.
- Los pedidos históricos siguen disponibles en Administrador → Pedidos; la base de datos no se altera.

## Para activar el pago real

1. Obtener la llave de identidad para la API de Link de pagos de Bold y confirmar su activación.
2. Crear un enlace de pago de monto cerrado en backend, usando totales calculados desde la base de datos, referencia única y vencimiento.
3. Guardar relación entre referencia Bold y pedido con estado `pago_pendiente`.
4. Verificar firma HMAC-SHA256 del webhook `x-bold-signature`, la referencia y el monto antes de marcar `pagado`.
5. Registrar reintentos/idempotencia, pedidos rechazados, expiración de reservas y conciliación ante webhooks atrasados.
6. Solo contabilizar pagos confirmados como ventas. Separar pago de entrega física.

No se ha habilitado ni simulado un pago real. El usuario indicó que probablemente usa Bold, pero no hay credenciales ni confirmación del método disponible.

Documentación oficial: https://developers.bold.co/pagos-en-linea/api-link-de-pagos y https://developers.bold.co/webhook
