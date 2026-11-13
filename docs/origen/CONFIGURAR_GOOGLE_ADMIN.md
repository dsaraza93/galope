# Activar acceso seguro al administrador de Baby Center

La aplicación está configurada para exigir **Google** y permitir **solo babycenter159@gmail.com**. El acceso de prueba `AUTH_MODE=open` queda bloqueado en producción. **Aún falta obtener el OAuth Client ID del negocio**; sin él, el servidor en modo Google no arranca deliberadamente.

## Configuración

1. Abre https://console.cloud.google.com/apis/credentials y crea o selecciona un proyecto de Google Cloud.
2. Configura la pantalla de consentimiento (Google Auth Platform). Crea un cliente OAuth 2.0 de tipo **Aplicación web**.
3. En **Orígenes de JavaScript autorizados**, añade `http://localhost:3000` para pruebas locales y `https://TU-DOMINIO-REAL` para producción. No uses una ruta ni `/` final. Si Google está en modo pruebas, agrega `babycenter159@gmail.com` a los usuarios de prueba según lo exija la configuración.
4. Copia `.env.example` a `.env` (no lo publiques en GitHub); establece:

   AUTH_MODE=google
   ADMIN_EMAILS=babycenter159@gmail.com
   GOOGLE_CLIENT_ID=EL_ID_QUE_TERMINA_EN.apps.googleusercontent.com

5. Ejecuta `npm install` y `npm start`. Entra en `http://localhost:3000/#admin` e inicia sesión con la cuenta autorizada.
6. Prueba con una cuenta distinta: el servidor debe rechazarla. En el navegador prueba salir y entrar de nuevo, y verifica que sin sesión `/api/admin/products` responde 401.
7. Para producción usa HTTPS, `NODE_ENV=production`, configuración correcta de `TRUST_PROXY` según tu servidor y copias de seguridad de `data`.

**Importante:** nunca compartas contraseñas ni claves secretas de Google en el chat. El OAuth Client ID de tipo web no es secreto, pero mantenlo configurado en el entorno correcto. Activa verificación en dos pasos en la cuenta de Google del administrador.

## Seguridad implementada

- Verificación del ID token de Google en el servidor con `google-auth-library` y comprobación del correo verificado autorizado.
- Sesión aleatoria guardada con hash en BD, cookie `HttpOnly`, `SameSite=Lax` y `Secure` bajo HTTPS en producción.
- Protección de `/api/admin`, limitación de intentos, cabeceras de seguridad y validación de origen para mutaciones.
- En producción, el servidor se niega a iniciar con `AUTH_MODE=open`.

**Nota:** los recursos HTML/JS públicos pueden mostrar el enlace Administrar; la seguridad está en los endpoints privados y las sesiones, no en ocultar el enlace.
