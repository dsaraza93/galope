# Inventario y reservas — Baby Center

## Qué cambia
- Producto nuevo: stock inicial **0**, el administrador ingresa unidades reales.
- La tienda etiqueta como **Agotado** los productos de stock 0 y bloquea agregarlos al carrito.
- Al crear un pedido, la base de datos resta unidades del **stock disponible** y registra una **reserva**. Esta acción es atómica y evita vender las mismas unidades en dos pedidos concurrentes.
- La reserva dura **24 horas** por defecto (`RESERVATION_HOURS`, 1 a 168).
- Si el administrador cambia el pedido de **Nuevo** a **Confirmado**, **Enviado** o **Entregado**, la reserva se convierte en una venta: **no se vuelve a descontar**.
- Si cancela un pedido reservado, el sistema devuelve las unidades al stock **una sola vez**.
- Si vence una reserva aún en estado **Nuevo**, se marca **Cancelado** y se devuelven las unidades. La limpieza se ejecuta al iniciar el servidor, aproximadamente cada minuto y al consultar el catálogo o los pedidos.
- Los pedidos cancelados/vencidos **no se reactivan** para evitar reutilizar un inventario que ya pudo venderse. Debe crearse un pedido nuevo.
- No se puede eliminar un producto con reservas activas.

## Compatibilidad
Los pedidos existentes quedan marcados como inventario ya comprometido; no se les efectúa una segunda rebaja. La migración solo agrega columnas a `orders`. Respaldar siempre `data/babycenter.db` y `data/uploads` antes de instalar.

## Prueba recomendada (base de demostración)
1. Crear un producto con stock 0: debe aparecer agotado y no ser comprable.
2. Subir su stock a 2 y crear un pedido de una unidad: stock disponible pasa a 1 y pedido queda Nuevo/reservado.
3. Confirmarlo: el stock sigue en 1.
4. Crear otro pedido de una unidad: stock pasa a 0.
5. Cancelar ese segundo pedido: stock vuelve a 1; repetir cancelar no lo aumenta.
6. Crear un nuevo pedido y dejarlo sin confirmar hasta el vencimiento. El sistema debe cancelar y devolver el stock.

**Nota:** Crear un pedido aún no equivale a cobrar. Para integrar pagos reales o asignación al transportador, se requiere confirmar el cobro o pedido con un sistema compatible. Mientras tanto, el administrador confirma manualmente.
