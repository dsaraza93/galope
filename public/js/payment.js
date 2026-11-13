'use strict';
/* The browser never infers approval from a redirect or a checkout message.
   Only /bold/status, authenticated with the buyer token, can confirm a purchase. */
const BOLD_PENDING_KEY = 'galope_pending_bold';
let boldCheckPromise = null, boldCheckTimer = null, boldCheckCount = 0;
function readPendingBold() {
  let pending = lsGet(BOLD_PENDING_KEY, null);
  if (!pending) { try { pending = JSON.parse(sessionStorage.getItem(BOLD_PENDING_KEY) || 'null'); } catch {} }
  return pending && /^BC-[A-F0-9]{20}$/.test(pending.orderId) && /^[a-f0-9]{48}$/.test(pending.orderToken) ? pending : null;
}
function rememberBoldCheckout(data, items) {
  const pending = { orderId: data.orderId, orderToken: data.orderToken, items: items.map(({id,q}) => ({id,q})) };
  lsSet(BOLD_PENDING_KEY, pending);
  try { sessionStorage.setItem(BOLD_PENDING_KEY, JSON.stringify(pending)); } catch {}
  boldCheckCount = 0;
  return pending;
}
function forgetBoldCheckout(id) {
  for (const name of ['localStorage', 'sessionStorage']) {
    try { const storage=globalThis[name];if (JSON.parse(storage.getItem(BOLD_PENDING_KEY) || 'null')?.orderId === id) storage.removeItem(BOLD_PENDING_KEY); } catch {}
  }
  try { sessionStorage.removeItem('galope_checkout_attempt'); } catch {}
}
function removePurchasedItems(current, purchased) {
  const quantities = new Map();
  for (const item of purchased) {
    if (!Number.isSafeInteger(item.id) || item.id < 1 || !Number.isSafeInteger(item.q) || item.q < 1) throw new Error('Productos del pago inválidos');
    quantities.set(item.id, (quantities.get(item.id) || 0) + item.q);
  }
  return current.map(item => ({ id: item.id, q: Math.max(0, item.q - (quantities.get(item.id) || 0)) })).filter(item => item.q > 0);
}
function repaintPaidCart() {
  upd(); renderGrid();
  if ($('#drawer')?.classList.contains('on')) drawer({refreshOnly:true});
}
async function applyConfirmedPurchase(pending, state) {
  const apply = () => {
    const saved = lsGet('galope_paid_orders', []);
    const completed = Array.isArray(saved) ? saved : [];
    // Polling, redirects, refreshes and another tab may report the same sale.
    if (!completed.includes(pending.orderId)) {
      if (!Array.isArray(state.items) || !state.items.length) throw new Error('Falta el detalle verificado del pago');
      cart = removePurchasedItems(lsGet('galope_cart', cart), state.items);
      saveCart();
      lsSet('galope_paid_orders', [...completed, pending.orderId].slice(-100));
    } else cart = lsGet('galope_cart', cart);
    forgetBoldCheckout(pending.orderId);
    repaintPaidCart();
  };
  // Serialize cart edits across same-origin tabs where Web Locks is available.
  if (globalThis.navigator?.locks) await navigator.locks.request('galope-paid-cart', apply);
  else apply();
  toast('¡Pago confirmado! Gracias por tu compra.');
  // Refresh stock after removing the purchased quantities, not before.
  try { await loadStore(); repaintPaidCart(); } catch { /* payment and cart are already persisted */ }
}
function scheduleBoldCheck() {
  clearTimeout(boldCheckTimer);
  if (!readPendingBold() || document.hidden || boldCheckCount >= 24) return;
  // Bounded polling: up to 6 fast checks, then 30 seconds. Stay below API limits.
  boldCheckTimer = setTimeout(() => { void checkBoldReturn({quiet:true}); }, boldCheckCount < 6 ? 5000 : 30000);
}
function checkBoldReturn({quiet = false, restart = false} = {}) {
  if (boldCheckPromise) return boldCheckPromise;
  if (restart) boldCheckCount = 0;
  clearTimeout(boldCheckTimer);
  const url = new URL(location.href), returning = url.searchParams.has('bold-return');
  if (returning) { url.searchParams.delete('bold-return'); history.replaceState({}, '', url.pathname + url.search + url.hash); }
  const pending = readPendingBold();
  if (!pending) { if (returning) toast('Consulta el resultado de tu pago con la tienda.'); return Promise.resolve(null); }
  boldCheckPromise = (async () => {
    boldCheckCount++;
    try {
      const state = await api('/bold/status', {method:'POST', body:{orderId:pending.orderId,orderToken:pending.orderToken}});
      // Ignore an old request if another purchase replaced this pending checkout.
      if (readPendingBold()?.orderId !== pending.orderId) return state;
      if (state.orderId !== pending.orderId) throw new Error('Referencia de pago inconsistente');
      if (state.status === 'PAID') await applyConfirmedPurchase(pending, state);
      else if (state.status === 'REJECTED') {
        if(state.rejectionConfirmed&&state.stockReleased){
          forgetBoldCheckout(pending.orderId);
          try { await loadStore(); } catch {}
          repaintPaidCart();
          if (!quiet || returning) toast('Pago rechazado. La reserva se liberó y tu carrito se conserva para volver a intentar.');
        }else{
          repaintPaidCart();
          if (!quiet || returning) toast('Rechazo recibido. Estamos confirmando con Bold la devolución de la reserva.');
          scheduleBoldCheck();
        }
      } else if (state.status === 'REVIEW') {
        if (!quiet || returning) toast('Tu pago requiere revisión de la tienda. No vuelvas a pagar.');
      } else {
        if (!quiet || returning) toast('Estamos verificando tu pago. Tu carrito se conserva; no vuelvas a pagar.');
        scheduleBoldCheck();
      }
      return state;
    } catch {
      if (!quiet || returning) toast('Estamos verificando tu transacción. Tu carrito se conserva.');
      scheduleBoldCheck();
      return null;
    }
  })().finally(() => { boldCheckPromise = null; });
  return boldCheckPromise;
}
window.addEventListener('focus', () => { void checkBoldReturn({quiet:true}); });
window.addEventListener('pageshow', () => { void checkBoldReturn({quiet:true}); });
window.addEventListener('online', () => { void checkBoldReturn({quiet:true,restart:true}); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void checkBoldReturn({quiet:true});
  else clearTimeout(boldCheckTimer);
});
window.addEventListener('storage', event => {
  if (event.key !== 'galope_cart') return;
  cart = lsGet('galope_cart', cart);
  repaintPaidCart();
});
