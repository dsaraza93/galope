# Baby Center — preparado para mensajería oficial futura

## Ahora
- Los suscriptores se segmentan por Bebé, Kids o Ambos y mantienen consentimiento/bajas.
- El administrador guarda campañas como **borradores** y puede exportar contactos autorizados.
- `GET /api/admin/messaging/status` informa `configured: false`, `sendingEnabled: false`.
- `GET /api/admin/campaigns/:id/preview` calcula el público autorizado vigente, sin enviar.
- `POST /api/admin/campaigns/:id/send` retorna 501 **intencionalmente**. No hay comunicación saliente ni cargos.
- El punto de integración está aislado en `server/whatsapp-provider.js`.

## Para activar posteriormente (NO incluido ni habilitado)
1. Crear/verificar cuenta WhatsApp Business Platform y número, plantilla comercial aprobada y permisos válidos.
2. Almacenar credenciales **solo en variables de entorno del servidor**, jamás en frontend o base exportada.
3. Implementar adaptador oficial con cola persistente, idempotencia, reintentos acotados y pausas.
4. Volver a comprobar consentimiento activo, segmentación y bajas **antes de cada envío**.
5. Exigir confirmación explícita humana de la campaña, estimar costos y aplicar límite presupuestal.
6. Verificar autenticidad de webhooks y guardar estados separados: en cola, aceptado, enviado, entregado, leído, fallido.
7. Implementar recepción de solicitudes de baja, auditoría mínima, y un apagado inmediato de campañas.
8. Probar en entorno de ensayo con números de prueba antes de utilizar números de clientes.

No confundir exportación de audiencia con sincronización en WhatsApp. La presente versión no importa ni envía contactos automáticamente a WhatsApp.


## Adjuntos multimedia listos para campañas

El administrador ya puede guardar borradores de campañas con una imagen o un video.
- Imágenes admitidas: JPG, PNG y WebP.
- Videos admitidos: MP4, WebM y MOV.
- El adjunto queda guardado en el servidor y asociado al borrador de campaña.
- No se envía todavía: se utilizará cuando se conecte la API oficial de WhatsApp.

Recomendación comercial: para campañas privadas, priorizar imagen cuadrada o vertical corta y videos ligeros.
