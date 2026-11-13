'use strict';
/**
 * Boundary for a future official WhatsApp Business Platform integration.
 * No WhatsApp Web automation is used. No messages can be sent in this version.
 * When integrating, implement the provider with approved templates, opt-out
 * enforcement, rate/error handling, durable queue and verified webhook updates.
 */
function status() {
  return {
    provider: 'none', configured: false, sendingEnabled: false,
    supportsBackgroundSending: false, supportsDeliveryReceipts: false,
    reason: 'API oficial pendiente de configurar. No se enviará ningún mensaje.',
  };
}
module.exports = { status };
