# Publicar Galope en Cloudflare cuando se autorice

La entrega actual es solo el repositorio GitHub, conforme a lo solicitado. Estos pasos se ejecutan posteriormente en una cuenta Cloudflare autorizada.

## 1. Recursos propios

```bash
cd cloudflare
npm ci
npx wrangler login
npx wrangler d1 create galope
npx wrangler r2 bucket create galope-media
```

En `wrangler.jsonc`, ya se configuró `d1_databases[0].database_id` con `4fff9503-b366-4c8c-831a-1a3d0bf33fff`, proporcionado para **galope**. Confirma que pertenezca a la cuenta y que el nombre de la base sea correcto antes de aplicar migraciones. Conserva el binding `DB`. El bucket usa el binding `MEDIA`. R2 puede requerir habilitar facturación en tu cuenta.

## 2. Administración

Configura en `vars`:

- `GOOGLE_CLIENT_ID`: ID de cliente OAuth web de Galope.
- `ADMIN_EMAILS`: correo o correos autorizados separados por comas.

En Google Cloud autoriza el origen local y el futuro origen HTTPS del Worker. No agregues `/#admin` al origen. No se necesita un client secret para este flujo. Nunca publiques llaves privadas en GitHub.

## 3. Inicializar la tienda nueva

```bash
npm run db:remote
```

Aplica todas las migraciones, hasta `0007_campaign_mobile_media.sql`. `npm run deploy` inicializa automáticamente los ajustes faltantes. Agrega el catálogo de ejemplo solo si no hay configuración, productos ni pedidos. Los despliegues siguientes conservan los datos y no restauran ejemplos borrados. En una instalación nueva, no importes datos de otro negocio.

En el panel completa fotografías, precios, existencias y condiciones de envío/retiro. El catálogo de referencia comienza con stock cero y los banners ocultos.

## 4. Pagos

`BOLD_MODE=sandbox` y las llaves vacías son el estado inicial. Guarda las llaves de Galope mediante el mecanismo seguro del proveedor:

```bash
npx wrangler secret put BOLD_TEST_API_KEY
npx wrangler secret put BOLD_TEST_SECRET_KEY
npx wrangler secret put BOLD_WEBHOOK_SECRET
```

No introduzcas sus valores en archivos versionados ni en chat. El webhook será `https://TU-DOMINIO/api/bold/webhook`. Las pruebas automatizadas simulan Bold: no certifican una cuenta comercial ni un cobro real. Antes de aceptar dinero real, verifica aprobación/rechazo, importe y moneda, webhook, reintentos e inventario. Conserva la exigencia de `payment-verification.private.json` del preflight y las dos confirmaciones de producción. No reutilices las llaves de otro comercio.

## 5. Verificar y publicar

```bash
npm test
npm run check
npm run deploy
npm run smoke -- https://galope.TU-SUBDOMINIO.workers.dev
```

`deploy` comprueba los recursos D1/R2 e inicializa de forma segura la tienda antes de publicar. Si Google aún no está configurado, muestra un aviso y permite publicar la tienda; el panel administrador permanece bloqueado, incluso para sesiones anteriores. Configura Google para habilitar el acceso autorizado. El cron de conciliación se instala junto con el Worker. Un despliegue requiere conexión autorizada a Cloudflare; tener acceso a GitHub por sí solo no la proporciona.

Se puede conectar después este repositorio con Cloudflare Workers Builds. Configura como carpeta raíz `cloudflare`, instalación `npm ci` y comando de despliegue `npm run db:remote && npm run deploy`. No agregues `seed:remote` a cada despliegue. Mantén los secretos en Cloudflare y la configuración de recursos en `wrangler.jsonc`.

## Pendientes de acceso y configuración

El nombre configurado para el bucket es `galope-media`; debe coincidir con el nombre real del bucket en Cloudflare. El valor `2921473c01d366dccb385ff56cb48513` se recibió como identificador de R2, pero un binding R2 requiere `bucket_name`, no un identificador opaco. Su función no se ha confirmado: no se añadió como bucket ni como credencial.

El correo administrador ya se configuró como `galopegalope44@gmail.com`. El ID público de cliente OAuth de Google ya está configurado. Antes de iniciar sesión, autoriza en Google Cloud el origen HTTPS real de la tienda. Sigue pendiente una sesión autorizada de Cloudflare para publicar desde este entorno. El ID de base de datos y el acceso a GitHub no autentican frente a Cloudflare.

Para explicar el almacenamiento gratuito al cliente, consulta [FOTOS_Y_COSTOS.md](FOTOS_Y_COSTOS.md).

## Tienda publicada con respuesta 503 tras la primera instalación

Las migraciones crean tablas pero no bastan para abrir el catálogo. La inicialización ahora forma parte de `npm run deploy`, mediante `scripts/bootstrap.sql`. Repite el despliegue del commit corregido con el comando habitual: `cd cloudflare && npm run db:remote && npm run deploy`. El catálogo y los ajustes existentes se conservan.
