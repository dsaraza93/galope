# Galope · Tienda Llanera

Tienda independiente adaptada desde Babycenter con la identidad y el catálogo de referencia de Galope: rojo, negro y crema, logo original, sombreros, botas, camisas baqueras, correas, cotizas, gorras, ruanas y accesorios.

**Estado:** proyecto conectado a Cloudflare Workers + D1 + R2. El despliegue ahora inicializa automáticamente una base recién migrada antes de publicar. No se ha conectado una cuenta de pagos.

## Funciones

- Catálogo, búsqueda con sugerencias, filtros por categoría y público (hombre, mujer, unisex), ofertas y favoritos.
- Fichas de producto, hasta cuatro fotos, galería, zoom y enlaces compartibles.
- Carrito persistente, recuperación de pagos, checkout Bold y conciliación de inventario en servidor.
- Administración mediante Google: productos, existencias, pedidos y estados logísticos, clientes, ventas y exportaciones CSV.
- Banners con imagen o video y archivo móvil, enlaces a productos, promociones secundarias y beneficios editables.
- Club Galope con consentimiento, intereses hombre/mujer/ambos, bajas, campañas con adjuntos y lotes de difusión manuales.
- Navegación móvil, accesibilidad de diálogos y preferencia de movimiento reducido.

Los artículos unisex se incluyen al explorar hombre o mujer y también pueden consultarse por separado. El filtro de ofertas muestra productos cuyo precio anterior es mayor que el actual.

El WhatsApp de atención es **+57 311 504 4650**, configurable desde el panel. El catálogo inicial reproduce los **12 ejemplos** del archivo enviado, con **stock cero** hasta que el negocio confirme las existencias. No se heredaron compradores, pedidos, sesiones ni credenciales de Babycenter. Las cinco posiciones de banners empiezan ocultas y se activan desde el panel después de cargar las piezas de Galope.

## Ejecutar y comprobar la versión principal

Requisitos: Node.js 24 y npm.

```bash
cd cloudflare
npm ci
npm run db:local
npm run seed:local
npm run dev
```

Tienda: `http://localhost:8787`. Administración: `http://localhost:8787/#admin`.

Para entrar a administración se requiere configurar un cliente OAuth web de Google y el correo administrador en `cloudflare/wrangler.jsonc`. Autoriza el origen local en Google Cloud. El correo administrador configurado es `galopegalope44@gmail.com`. La tienda puede desplegarse mientras se obtiene el ID de cliente de Google; el panel permanece bloqueado hasta completar esa configuración.

```bash
npm test
npm run check
```

La integración continua de GitHub ejecuta ambas comprobaciones al subir cambios. `npm run check` compila el Worker sin publicarlo. No hace cobros.

## Publicar más adelante

Consulta [DESPLIEGUE.md](DESPLIEGUE.md). La configuración se llama `galope`, con una base D1 `galope` y un bucket R2 `galope-media`. El identificador de D1 ya corresponde al facilitado para Galope. Aún deben confirmarse el nombre real del bucket y los datos de acceso con Google antes de publicar. No reutilices los recursos de Babycenter.

Bold conserva el flujo del proyecto original, pero necesita las llaves propias del comercio. Permanece en **sandbox** y sin llaves: el checkout no realiza cobros. Addi y Sistecrédito siguen pendientes como en el origen. Las campañas se preparan y exportan manualmente; no hay proveedor oficial de WhatsApp configurado.

## Estructura

- `cloudflare/`: versión principal para Workers, D1 y R2, migraciones y pruebas.
- `cloudflare/public/`: interfaz principal; `public/` mantiene una copia para el servidor Node heredado.
- `server/`: alternativa Express/SQLite conservada del origen; requiere sus propias dependencias y configuración. La validación de esta adaptación se centra en Workers.
- `.github/workflows/validate.yml`: pruebas y compilación, sin despliegue automático.

El esquema conserva internamente `world` y las columnas de edad para compatibilidad estructural; la interfaz comercial usa públicos hombre/mujer/unisex y no presenta filtros infantiles. Esta instalación es para un negocio nuevo, no para importar la base productiva de Babycenter.
