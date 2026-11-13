# Baby Center - Bold Sandbox, modal y monto fijo

## Cambios

* El botón **Comprar** conserva su diseño y abre `BoldCheckout` con `renderMode: embedded`.
* El valor **NO** lo escribe el comprador: `/api/bold/start` calcula productos, envío y total usando los datos de la BD, y genera el hash de integridad con la llave secreta.
* Se precargan nombre, celular y documento del checkout en Bold.
* Para pruebas locales usar **http://localhost:3100**, NO 127.0.0.1, y configurar Google para ese origen si se utiliza el admin.
* No se incluye tu `.env` ni la BD. Mantén los originales y sustituye solo `public/js/store.js` si ya tienes el proyecto funcionando.

## Ejecutar

1. Copia `public/js/store.js` del ZIP a tu proyecto original (sobrescribe el archivo).
2. Conserva tu `.env` con las llaves vigentes de **Botón de pagos - pruebas**, incluyendo identidad Y secreta del MISMO par.
3. `npm start` con `PORT=3100`, abre http://localhost:3100.
4. Selecciona producto con stock, completa datos y presiona Comprar. Debe aparecer el total fijo en el modal.

## Si persiste BTN-000 / HTTP 403

La prueba de monto abierto (solo apiKey) demuestra que Bold identifica la llave. La de monto fijo depende adicionalmente de la firma correcta, generada con la **llave secreta que pertenece exactamente a la llave de identidad que sí funcionó**. Que ambas figuren como de prueba no garantiza que sean del mismo par si se regeneraron entre pruebas.

No procesar ventas reales ni descontar inventario basándose únicamente en parámetros de retorno. El backend verifica por separado el estado. En sandbox no hay webhooks automáticos.
