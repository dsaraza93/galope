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

En `wrangler.jsonc`, reemplaza el UUID de ceros de `d1_databases[0].database_id` por el UUID devuelto para **galope**. Conserva el binding `DB`. El bucket usa el binding `MEDIA`. R2 puede requerir habilitar facturación en tu cuenta.

## 2. Administración

Configura en `vars`:

- `GOOGLE_CLIENT_ID`: ID de cliente OAuth web de Galope.
- `ADMIN_EMAILS`: correo o correos autorizados separados por comas.

En Google Cloud autoriza el origen local y el futuro origen HTTPS del Worker. No agregues `/#admin` al origen. No se necesita un client secret para este flujo. Nunca publiques llaves privadas en GitHub.

## 3. Inicializar la tienda nueva

```bash
npm run db:remote
npm run seed:remote
```

Aplica todas las migraciones, hasta `0007_campaign_mobile_media.sql`. Ejecuta `seed:remote` **solo al preparar una instalación nueva**. El seed no sobreescribe productos existentes, pero repetirlo tras borrar ejemplos puede volver a agregarlos. No importes pedidos ni bases de Babycenter para esta tienda.

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

`deploy` comprueba que D1 y Google estén configurados antes de publicar. El cron de conciliación se instala junto con el Worker. Un despliegue requiere conexión autorizada a Cloudflare; tener acceso a GitHub por sí solo no la proporciona.

Se puede conectar después este repositorio con Cloudflare Workers Builds. Configura como carpeta raíz `cloudflare`, instalación `npm ci` y comando de despliegue `npm run db:remote && npm run deploy`. No agregues `seed:remote` a cada despliegue. Mantén los secretos en Cloudflare y la configuración de recursos en `wrangler.jsonc`.
