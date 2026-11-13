# Análisis de ventas — Baby Center

En Administrador → Resumen puedes consultar semana, quincena, mes, mes específico o rango de fechas.

- Ventas realizadas = pedidos con estado `Entregado`, usando la fecha en que cambiaron a ese estado.
- Pendientes = pedidos `Nuevo`, `Confirmado` o `Enviado`, agrupados según la fecha de creación.
- Cancelados = pedidos `Cancelado`, según fecha de creación.
- Los pedidos antiguos que ya estaban `Entregado` antes de esta actualización usan su fecha de creación como aproximación histórica, pues antes no existía fecha de entrega.
- El reporte registra unidades, ticket promedio y una evolución diaria de ventas entregadas.
- Los rangos se eligen en la interfaz según la hora local del navegador. Las fechas de SQLite se almacenan en UTC, por lo que pedidos cercanos a medianoche podrían asignarse a un día diferente; conviene fijar una zona horaria comercial antes del despliegue definitivo.

## Validación recomendada
1. Haz respaldo de `data/babycenter.db`.
2. Registra un pedido de prueba. Debe incrementar pendientes, no ventas entregadas.
3. Cambia a `Confirmado`. Debe seguir pendiente.
4. Cambia a `Entregado`. Debe incrementar pedidos y monto vendido una sola vez.
5. Filtra por mes y fechas específicas; comprueba que aparecen los días esperados.
6. Cancela una operación de prueba y revisa la columna de cancelados, el stock y su exclusión del total vendido.

**Nota:** un pedido `Entregado` se considera venta realizada por decisión de diseño; esta métrica no equivale necesariamente a pago recibido. Para controlar recaudo real sería necesario agregar un estado financiero separado.
