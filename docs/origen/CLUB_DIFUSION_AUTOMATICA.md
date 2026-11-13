# Baby Center: audiencias de difusión (fase sin API)

## Qué se automatiza
- El registro al Club se clasifica automáticamente según `interest`: Bebé, Kids o ambos.
- Los suscriptores sin consentimiento o dados de baja no se incluyen en altas.
- Si un contacto cambia de intereses o se da de baja, aparece en la lista de retiros pendientes de las audiencias confirmadas.
- El administrador prepara un CSV de nuevas altas o retiros y el sistema conserva exactamente los contactos del archivo en un lote pendiente.
- Solo al pulsar **Confirmar gestión**, después de incorporarlos o retirarlos realmente en WhatsApp Business, se actualiza el seguimiento interno.

## Limitación relevante
No se crean ni se sincronizan listas de difusión de WhatsApp automáticamente, ni se envían mensajes. La importación CSV en WhatsApp Business depende de las funciones disponibles en la cuenta; para listas clásicas puede ser necesario añadir contactos y miembros manualmente. Tampoco existe confirmación automática de entrega.

## Instalación
Respalda la base de datos SQLite activa antes del cambio. La migración de las tablas `broadcast_members` y `broadcast_batches` se crea al iniciar la aplicación. Mantén la base real del despliegue; el ZIP no contiene datos del cliente.
