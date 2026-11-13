# Administración de Galope

Abre https://galope.galopegalope44.workers.dev/#admin o pulsa «Acceso administrador» en el footer. La cuenta autorizada es **galopegalope44@gmail.com**. Usa el botón de Google; la sesión se valida en el servidor y se guarda en una cookie HttpOnly del sitio.

## Si Google indica `origin_mismatch`

En https://console.cloud.google.com/auth/clients selecciona el cliente `89468337219-9iruu38h1orohhpkr559umh35gk072be.apps.googleusercontent.com`. En **Orígenes autorizados de JavaScript**, registra exactamente:

```text
https://galope.galopegalope44.workers.dev
```

No agregues rutas, `/#admin` ni una barra al final. Guarda, espera la propagación de Google y vuelve a entrar. Si agregas un dominio propio, registra también ese origen HTTPS. El identificador de cliente es público; los secretos privados no se guardan en este repositorio.

La configuración de orígenes pertenece al proyecto de Google Cloud y no se modifica al desplegar en Cloudflare. La pantalla de acceso incluye el origen actual y un enlace a la configuración para facilitar el diagnóstico. No existe un acceso administrativo público que evite verificar Google.

## Errores de carga y sesiones

Si Google no carga, la pantalla explica el fallo y permite «Reintentar acceso». Al volver a entrar desde la tienda se comprueba la sesión existente. «Salir» solicita al servidor revocar la sesión; si falla la conexión se muestra el error.

Los módulos son Resumen, Productos, Pedidos, Clientes, Pagos Bold, Banners, Ajustes y Club y campañas. El registro del Club guarda los datos y el consentimiento en Suscriptores. Las campañas se guardan como borradores; no se simulan envíos automáticos de WhatsApp.
