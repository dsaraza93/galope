export const categories=[["Sombreros", "sombreros"], ["Botas", "botas"], ["Camisas baqueras", "camisas"], ["Correas", "correas"], ["Cotizas", "cotizas"], ["Gorras", "gorras"], ["Ruanas y cobijas", "ruanas"], ["Accesorios", "accesorios"]];
export function config(env){return {
 categories,orderStatuses:['Nuevo','Confirmado','Enviado','Entregado','Cancelado'],
 googleClientId:env.GOOGLE_CLIENT_ID||'',adminEmails:(env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),
 sessionTtlMs:Math.min(24,Math.max(1,Number(env.SESSION_TTL_HOURS)||12))*3600000
};}
