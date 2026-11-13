# Baby Center — revisión general (27 de octubre de 2026)

## Cambios aplicados
- Se retiró el enlace **Administrar** del encabezado de la tienda.
- Se conservó **Acceso administrador** exclusivamente en el footer. El panel sigue siendo accesible mediante `/#admin`; esconder el enlace no sustituye autenticación.
- Se eliminó una clave `shipping` duplicada en la respuesta de `/api/store`, sin cambiar la lógica de entregas.

## Validaciones realizadas
- Sintaxis de todos los archivos `.js` de `server/` y `public/js/`: sin errores.
- Inspección de rutas: `/api/admin` está protegido por `requireAdmin`; el modo Google valida el token de identidad, el correo autorizado y la sesión mediante cookie HttpOnly.
- CSP, limitación de peticiones API y cabeceras de seguridad presentes en servidor.
- En modo producción, `AUTH_MODE=open` está bloqueado.
- Archivo `.env` y carpeta `data/` están excluidos por `.gitignore`; no se incluyen en este ZIP.

## Pendientes / advertencias importantes
1. **Checkout y pagos:** `/api/orders` responde 503 intencionalmente; `submitOrder` no registra pagos. No se pueden procesar compras reales sin integrar y verificar el proveedor y sus webhooks. Los logos no acreditan integración.
2. **Prueba de ejecución:** no se pudo iniciar Express en este entorno, porque no terminó la instalación de dependencias (`npm ci` interrumpido). Sí se verificó sintaxis; las pruebas funcionales deben ejecutarse en el equipo o entorno de despliegue.
3. **Autenticación real:** pendiente probar con un `GOOGLE_CLIENT_ID` válido y `ADMIN_EMAILS=babycenter159@gmail.com`, y comprobar respuesta 401 sin sesión y acceso solo con cuenta autorizada.
4. **Pagos e inventario:** completar flujo de pago confirmado, reserva, liberación por vencimiento y recuperación de errores con pruebas concurrentes antes de publicar.
5. **Envíos:** el costo es fijo, no hay cálculo automático por ciudad/peso/transportadora.
6. **Pruebas UI:** verificar navegación responsive, carruseles, filtros, búsqueda, uploads, club y campañas en navegador. No se verificó visualmente cada pantalla.

## Instalación
1. Mantener en lugar seguro el `.env` vigente y la base `data/babycenter.db`.
2. Sustituir el código actualizado, sin borrar `data/`.
3. `npm install` y `npm start` en la carpeta que contiene `package.json`.
4. Revisar la tienda y el enlace de acceso ubicado en el footer.
