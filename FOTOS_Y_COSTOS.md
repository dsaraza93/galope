# Fotos de Galope y cuota gratuita de almacenamiento

Texto sugerido para el cliente:

> La tienda optimiza las fotografías y las guarda en Cloudflare R2. Su cuota gratuita de almacenamiento Standard es de 10 GB-mes al mes. Como referencia, esa capacidad equivale aproximadamente a 20.000 fotos de 500 KB almacenadas durante todo un mes, si la cuota completa está disponible para las imágenes. El uso que exceda las cuotas puede generar cargos.

No es un límite de 20.000 fotos nuevas cada mes ni una garantía de que toda la tienda funcione gratis. Depende del peso final de los archivos, el consumo de otros buckets de la cuenta y los videos u otros medios guardados.

| Tamaño medio final de cada foto | Fotos aproximadas en 10 GB |
| --- | ---: |
| 250 KB | 40.000 |
| 500 KB | 20.000 |
| 1 MB | 10.000 |

Cálculo con unidades decimales: 10 GB = 10.000.000.000 bytes. Son estimaciones de capacidad; no se midió el tamaño medio del catálogo ni el espacio libre de la cuenta.

R2 Standard también incluye 1 millón de operaciones de clase A y 10 millones de clase B al mes. Superar esas cuotas puede generar cargos aunque el almacenamiento no llegue a 10 GB. La cuota gratuita no aplica a Infrequent Access. Verifica el consumo real en el panel de Cloudflare. Otros servicios, como Workers o D1, tienen sus propias cuotas.

El formulario conserva el límite actual de **4 fotos por producto**. Ese límite de galería es independiente de la capacidad total de almacenamiento. Las imágenes se optimizan a WebP; no se garantiza que cada una pese 500 KB.

Referencia: [tarifas oficiales de Cloudflare R2](https://developers.cloudflare.com/r2/pricing/).

La misma explicación aparece en Administración → Productos → Editar → «¿Cuántas fotos puedo almacenar sin coste de R2?».
