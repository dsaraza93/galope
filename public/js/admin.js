'use strict';
/* ---------- Panel de administración ---------- */
const ST = ['Nuevo', 'Confirmado', 'Enviado', 'Entregado', 'Cancelado'];
const BADGES = ['', 'Nuevo', 'Descuento', 'Destacado', 'Más vendido', 'Favorito'];
const TABS = [['res', '📊 Resumen'], ['pro', '📦 Productos'], ['ord', '📋 Pedidos'], ['ped', '👥 Clientes'], ['pag', '💳 Pagos Bold'], ['ban', '🖼️ Banners'], ['aju', '⚙️ Ajustes'], ['sus', '💌 Club y campañas']];
let tab = 'res', auth = null, AP = [], ordFilter = '', imgsD = [];
let customerPeriod='month', customerOffset=0, customerMonth='', customerQuarter='1', customerYear='', customerSegment='all';
let customerSearch='';
let salesPeriod='today', salesOffset=0, salesMonth='', salesFrom='', salesTo='';
const ymd = d => [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function salesDates() {
 const today=new Date(); let a,b;
 if(salesPeriod==='today') return {from:ymd(today),to:ymd(today)};
 if(salesPeriod==='custom') {a=salesFrom||ymd(today);b=salesTo||ymd(today);return {from:a,to:b};}
 if(salesPeriod==='specific') {const [y,m]=(salesMonth||ymd(today).slice(0,7)).split('-').map(Number);a=new Date(y,m-1,1);b=new Date(y,m,0);}
 else if(salesPeriod==='week'){const day=new Date(today.getFullYear(),today.getMonth(),today.getDate());day.setDate(day.getDate() - ((day.getDay()+6)%7) + salesOffset*7);a=day;b=new Date(day);b.setDate(day.getDate()+6);}
 else if(salesPeriod==='fortnight'){let y=today.getFullYear(),m=today.getMonth(),part=today.getDate()>15?1:0;let absolute=(y*12+m)*2+part+salesOffset;let month=Math.floor(absolute/2);part=((absolute%2)+2)%2;y=Math.floor(month/12);m=((month%12)+12)%12;a=new Date(y,m,part?16:1);b=part?new Date(y,m+1,0):new Date(y,m,15);}
 else {a=new Date(today.getFullYear(),today.getMonth()+salesOffset,1);b=new Date(today.getFullYear(),today.getMonth()+salesOffset+1,0);}
 return {from:ymd(a),to:ymd(b)};
}

const fdate = (d) => new Date(d).toLocaleString('es-CO');

async function adminShell(body) {
  if(location.hash!=='#admin')return;
  const who = auth && auth.mode === 'google'
    ? `<span class="who">${esc(auth.email)}</span><button class="pill sm ghost" data-act="logout">Salir</button>` : '';
  $('#app').innerHTML = `<header class="top admin-header"><div class="wrap"><a class="brand" href="#"><img src="/img/logo.webp" alt="Galope"></a><b style="font:700 25px 'Playfair Display'">Panel de administración</b><span style="flex:1"></span>${who}<a class="pill sm" href="#">← Ver tienda</a></div></header>
<div class="wrap adm"><nav class="side" aria-label="Administración">${TABS.map((t) => `<button class="${tab === t[0] ? 'on' : ''}" data-act="tab" data-arg="${t[0]}">${t[1]}</button>`).join('')}</nav><main>
${auth.mode === 'open' ? '<div class="warn"><b>Acceso provisional:</b> el panel entra sin contraseña (AUTH_MODE=open). Antes de publicar la tienda, activa el inicio de sesión con Google (ver README).</div>' : ''}
${body}</main></div>`;
}

/* ---------- Acceso ---------- */
let googleLoadPromise=null;
function loadGoogle() {
  if(window.google?.accounts?.id)return Promise.resolve();
  if(googleLoadPromise)return googleLoadPromise;
  googleLoadPromise=new Promise((resolve,reject)=>{
    document.getElementById('galope-google-client')?.remove();
    const script=document.createElement('script');script.id='galope-google-client';
    const timer=setTimeout(()=>{script.remove();reject(new Error('Google no respondió. Comprueba tu conexión y vuelve a intentarlo.'));},12000);
    script.src='https://accounts.google.com/gsi/client';script.async=true;
    script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.id)resolve();else{script.remove();reject(new Error('No se pudo iniciar el acceso con Google.'));}};
    script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('No se pudo cargar Google. Comprueba bloqueadores o tu conexión y vuelve a intentarlo.'));};
    document.head.appendChild(script);
  }).catch(error=>{googleLoadPromise=null;throw error;});
  return googleLoadPromise;
}
function loginError(message){const target=$('#lerr');if(location.hash==='#admin'&&target)target.textContent=message;}
async function showLogin() {
  if(location.hash!=='#admin')return;
  $('#app').innerHTML=`<header class="top admin-header"><div class="wrap"><a class="brand" href="#"><img src="/img/logo.webp" alt="Galope"></a><span style="flex:1"></span><a class="pill sm" href="#">← Ver tienda</a></div></header>
<div class="login galope-login"><h2>Galope · Administración</h2><p>Inicia sesión con <strong>galopegalope44@gmail.com</strong> para administrar tu empresa.</p><div id="gbtn" aria-label="Iniciar sesión con Google"></div><p class="err" id="lerr" role="alert"></p><button type="button" class="pill sm ghost" data-act="admin">Reintentar acceso</button><details class="login-config"><summary>¿Google muestra «origin_mismatch»?</summary><p>En el cliente OAuth de Google Cloud, añade este origen exacto a los <strong>Orígenes autorizados de JavaScript</strong>:</p><code>${esc(location.origin)}</code><p>Utiliza el cliente <code>${esc(auth.googleClientId||'Pendiente de configurar')}</code>. Guarda el cambio en Google Cloud y vuelve a intentar el acceso.</p><a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener noreferrer">Abrir configuración de Google</a></details></div>`;
  if(!auth.googleClientId){loginError('El acceso administrador está pendiente de configurar: falta GOOGLE_CLIENT_ID en Cloudflare.');return;}
  try {
    await loadGoogle();if(location.hash!=='#admin'||!$('#gbtn'))return;
    google.accounts.id.initialize({client_id:auth.googleClientId,login_hint:'galopegalope44@gmail.com',auto_select:false,callback:async resp=>{
      try{await api('/auth/google',{method:'POST',body:{credential:resp.credential}});if(location.hash==='#admin')await admin();}
      catch(e){loginError(e.message);}
    }});
    google.accounts.id.renderButton($('#gbtn'),{theme:'outline',size:'large',text:'signin_with',locale:'es'});
  }catch(e){loginError(e.message);}
}
async function admin() {
  try {
    const status=await api('/auth/status');if(location.hash!=='#admin')return;auth=status;
  }catch(e){if(location.hash==='#admin')$('#app').innerHTML=`<div class="login"><h2>Galope · Administración</h2><p class="err">${esc(e.message)}</p><button class="pill" data-act="admin">Reintentar acceso</button><p><a href="#">Volver a la tienda</a></p></div>`;return;}
  if(!auth.authenticated)return showLogin();
  try{await renderTab();}catch(e){if(location.hash!=='#admin')return;if(e.status===401){auth.authenticated=false;return showLogin();}toast(e.message);}
}
let adminRenderRun=0;
async function renderTab() {
  const renderRun=++adminRenderRun,selectedTab=tab;
  let body = '';
  if (selectedTab === 'res') {
    const dates=salesDates();
    const r=await api('/admin/summary?'+new URLSearchParams(dates));
    const points=r.trend||[], top=r.topProducts||[];
    const maxDay=Math.max(1,...points.map(p=>p.amount));
    const maxUnits=Math.max(1,...top.map(p=>p.units));
    const bar=(pct,color)=>`<span style="display:block;height:100%;min-width:2px;width:${Math.max(1,Math.min(100,pct))}%;background:${color};border-radius:12px"></span>`;
    const chartRow=(label,value,width,color,amount)=>`<div style="display:grid;grid-template-columns:minmax(92px,135px) minmax(80px,1fr) auto;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #eee6f2"><small style="overflow:hidden;text-overflow:ellipsis">${esc(label)}</small><div style="height:14px;border-radius:20px;background:#f4eef9;overflow:hidden">${bar(width,color)}</div><strong style="white-space:nowrap;font-size:13px">${amount||value}</strong></div>`;
    const metric=(label,val,sub,color)=>`<div class="stat" style="border-top:3px solid ${color};min-width:0"><span>${label}</span><b>${val}</b>${sub?`<small>${sub}</small>`:''}</div>`;
    body=`<div class="sales-today-card"><div><span>HOY · ${esc(ymd(new Date()))}</span><h3>Ingresos confirmados</h3><p>Únicamente pagos Bold aprobados</p></div><strong>${COP(r.todaySales)}</strong><small>${r.todayOrders} compra(s) aprobada(s) hoy</small></div>
    <div class="panel sales-report"><div class="sec-h"><div><h3>Analítica comercial</h3><p>Ventas cobradas, productos y clientes. Se excluyen pagos pendientes o rechazados.</p></div></div>
    <div class="sales-quick" role="group" aria-label="Período de ventas">${[['today','Hoy'],['week','Semana'],['fortnight','Quincena'],['month','Mes'],['specific','Elegir mes'],['custom','Elegir fechas']].map(([v,t])=>`<button type="button" data-act="salesquick" data-arg="${v}" class="sales-quick-btn ${salesPeriod===v?'selected':''}" aria-pressed="${salesPeriod===v}">${t}</button>`).join('')}</div>
    <div class="sales-controls">${['week','fortnight','month'].includes(salesPeriod)?'<div class="sales-nav"><button type="button" class="pill sm ghost" data-act="salesprev">‹ Anterior</button><button type="button" class="pill sm ghost" data-act="salescurrent">Actual</button><button type="button" class="pill sm ghost" data-act="salesnext">Siguiente ›</button></div>':''}
    ${salesPeriod==='specific'?`<label>Mes<input type="month" data-chg="salesmonth" value="${esc(salesMonth||ymd(new Date()).slice(0,7))}"></label>`:''}
    ${salesPeriod==='custom'?`<label>Desde<input type="date" data-chg="salesfrom" value="${esc(dates.from)}"></label><label>Hasta<input type="date" data-chg="salesto" value="${esc(dates.to)}"></label>`:''}</div>
    <p class="sales-range">Del ${esc(dates.from)} al ${esc(dates.to)}</p></div>
    <div class="stats sales-stats">${metric('Ventas aprobadas',COP(r.sales),'Bold · período','#64318c')}${metric('Compras aprobadas',r.soldOrders,'Confirmadas','#2e9c69')}${metric('Ticket promedio',COP(r.average),'Por compra','#e9a13b')}${metric('Unidades vendidas',r.units,'En compras aprobadas','#598cc4')}</div>
    <div class="stats sales-stats">${metric('Clientes compradores',r.customers,'Identificados','#775db0')}${metric('Pagos pendientes',r.pending,'No cuentan como ventas','#c99930')}${metric('Rechazados / fallidos',r.rejected,'No cuentan como ventas','#d45a69')}${metric('Stock bajo',r.lowStock,`${r.outOfStock} agotado(s) · ${r.activeProducts} activos`,'#a36b9c')}</div>
    <div class="panel"><h3>Evolución de ingresos confirmados</h3><p style="color:var(--mut);font-size:13px;margin-bottom:10px">Cada barra representa dinero recibido en compras aprobadas.</p><div class="sales-bars">${points.length?points.map(p=>chartRow(p.day,p.amount,100*p.amount/maxDay,'linear-gradient(90deg,#6e3e9e,#c47cc7)',COP(p.amount))).join(''):'<p>No hay pagos aprobados en este período.</p>'}</div></div>
    <div class="panel"><h3>Productos más vendidos</h3><p style="color:var(--mut);font-size:13px;margin-bottom:10px">Ranking por unidades, solo en pagos confirmados.</p>${top.length?top.map(p=>chartRow(p.name,p.units,100*p.units/maxUnits,'linear-gradient(90deg,#e29fcb,#794ca3)',p.units+' ud. · '+COP(p.revenue))).join(''):'<p>Sin productos vendidos en este período.</p>'}</div>
    <div class="panel"><h3>Modalidad de entrega</h3><div class="stats sales-stats">${metric('Domicilio',r.delivery,'Compras aprobadas','#548cc0')}${metric('Retiro en tienda',r.pickup,'Compras aprobadas','#8051a6')}</div><p style="color:var(--mut);font-size:12px;margin-top:12px">Este panel refleja ventas aprobadas, no entregas realizadas. La logística se gestiona por separado.</p></div>`;
  }
  if (selectedTab === 'pro') {
    AP = await api('/admin/products');
    body = `<div class="panel"><div class="sec-h"><h3>Productos (${AP.length})</h3><button class="pill pk sm" data-act="pedit" data-arg="">+ Nuevo producto</button></div>${AP.map((p) => `<div class="row"><div class="mini" style="--t:${tint(p)}">${vis(p)}</div><div><b>${esc(p.name)}</b><br><small>${esc((p.categories || [p.cat]).join(' · '))} · ${p.world === 'unisex' ? 'Unisex' : p.world === 'mujer' ? 'Mujer' : 'Hombre'} · ${COP(p.price)} · Stock ${p.stock} · ${p.active ? 'Publicado' : 'Oculto'}</small></div><span></span><div class="acts"><button class="pill sm ghost" data-act="pedit" data-arg="${p.id}">Editar</button><button class="pill sm ghost" data-act="pdel" data-arg="${p.id}">Eliminar</button></div></div>`).join('')}</div>`;
  }
  if (selectedTab === 'pag') {
    const payments=await api('/admin/bold-payments');
    const labels={PENDING:'Pendiente',PAID:'Aprobado',REJECTED:'Rechazado',FAILED:'Fallido',REVIEW:'En revisión',EXPIRED:'Reserva antigua · requiere revisión',VERIFYING:'Verificación pendiente · reserva protegida'};
    const paid=payments.filter(p=>p.status==='PAID');
    body=`<div class="panel"><div class="sec-h"><div><h3>Pagos Bold (${payments.length})</h3><p>Registros de los intentos de pago. Solo se confirma un pago consultando a Bold.</p></div><button class="pill sm ghost" data-act="refreshpayments">Actualizar lista</button></div>
    <p><b>Pagos confirmados:</b> ${paid.length} · <b>Total confirmado:</b> ${COP(paid.reduce((n,p)=>n+p.total,0))}</p>
    ${payments.map(p=>`<div class="ord" style="margin-top:12px;border-left:5px solid ${p.status==='PAID'?'#1e9a56':p.status==='REJECTED'||p.status==='FAILED'?'#d63842':'#cf9218'};padding-left:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(p.id)} · ${COP(p.total)}</b><strong style="color:${p.status==='PAID'?'#167342':p.status==='REJECTED'||p.status==='FAILED'?'#b4232e':'#906000'};background:${p.status==='PAID'?'#dcfce7':p.status==='REJECTED'||p.status==='FAILED'?'#fee2e2':'#fff3cf'};border-radius:20px;padding:5px 12px">${esc(labels[p.status]||p.status)}</strong></div>
    <div>${esc(p.name)} · ${esc(p.tel)} · ${esc(p.createdAt)}</div>
    ${p.status==='PAID'&&p.fulfillment==='delivery'?`<div class="checkout-shipping-note"><b>Envío pendiente de cotización:</b> contacta al comprador, informa el valor y solicita su aceptación antes de coordinar el despacho. El transporte no se cobró en Bold.</div>`:''}
    <div style="margin:6px 0"><b>Documento:</b> ${p.documentNumber ? esc((p.documentType||'Documento')+' '+p.documentNumber) : '<span style="color:#b42318">Sin documento registrado · verificar antes del envío</span>'}</div>
    <small>${p.items.map(i=>esc(i.q+' × '+i.name)).join(', ')} · ${p.fulfillment==='pickup'?'Retiro':'Domicilio'}</small>
    <div style="margin-top:9px;padding:10px 12px;border:1px solid var(--line, #ddd);border-radius:10px;overflow-wrap:anywhere">
      <b>${p.fulfillment==='pickup'?'📦 Punto de retiro':'🚚 Dirección de entrega'}</b>
      <div>${esc(p.address||'Dirección no registrada')}</div>
      ${p.fulfillment!=='pickup'&&!p.address?'<small style="color:#b42318">Verificar con el cliente antes de despachar</small>':''}
    </div>
    ${p.status!=='PAID'?`<div class="payment-verification ${p.status==='REJECTED'&&p.rejectionConfirmed&&!p.stockHeld?'released':''}"><b>${p.status==='REJECTED'&&p.rejectionConfirmed&&!p.stockHeld?'Reserva liberada · rechazo confirmado':p.stockHeld?'Inventario reservado para este pedido':'Atención: requiere revisar el inventario'}</b><span>${p.status==='REJECTED'&&p.rejectionConfirmed&&!p.stockHeld?'Este intento ya no retiene unidades. La devolución de stock se realiza una sola vez.':p.status==='REJECTED'?'El rechazo está pendiente de confirmación por consulta a Bold; al confirmarlo se devuelve la reserva.':p.stockHeld?'La reserva se mantiene mientras el pago esté pendiente o no pueda verificarse. El tiempo y los errores no liberan unidades.':'La política anterior pudo liberar la reserva. Comprueba disponibilidad y concilia el pago antes de ofrecer esas unidades.'}</span>${p.verificationError?`<span>Última consulta: ${esc(p.verificationError)}. El error no equivale a un rechazo del cobro.</span>`:''}</div>`:''}
    ${p.verifiedCurrencySource?`<div><small>Moneda validada: ${esc(p.checkoutCurrency)} · ${p.verifiedCurrencySource==='SIGNED_CHECKOUT'?'moneda del checkout firmado; el comprobante no incluye moneda':'informada por Bold'}</small></div>`:''}
    <div><small>Estado de Bold: ${esc(p.paymentStatus||'Sin confirmar')} ${p.paymentId?' · Transacción: '+esc(p.paymentId):''}</small></div>
    ${['PENDING','VERIFYING','EXPIRED','REJECTED'].includes(p.status)?`<button type="button" class="pill sm ghost" data-act="verifyboldpayment" data-arg="${esc(p.id)}">Verificar con Bold</button>`:''}</div>`).join('')||'<p>Aún no existen intentos de pago.</p>'}
    <p style="color:var(--mut);font-size:12px;margin-top:12px">En Sandbox, Bold no envía webhooks automáticos. Un intento pendiente no es una venta confirmada.</p></div>`;
  }
  if (selectedTab === 'ord') {
    const orders=await api('/admin/orders'+(ordFilter?'?status='+encodeURIComponent(ordFilter):''));
    body=`<div class="panel"><div class="sec-h"><h3>Pedidos (${orders.length})</h3><a class="pill sm ghost" href="/api/admin/orders.csv">Descargar CSV</a></div><label class="fld">Filtrar por estado<select data-chg="ofilter"><option value="">Todos</option>${ST.map(s=>`<option ${ordFilter===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label>${orders.map(o=>`<div class="ord"><b>${esc(o.id)} · ${COP(o.total)}</b><p>${esc(o.name)} · ${esc(o.tel)} · ${esc(fdate(o.date))}</p><p>${esc(o.addr)}</p><p>${o.items.map(i=>esc(i.qty+' × '+i.name)).join(' · ')}</p><label class="fld">Estado<select data-chg="ostatus" data-id="${esc(o.id)}">${ST.map(s=>`<option ${o.status===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label><small>${esc(o.pay)} · ${esc(o.reservationState)}</small></div>`).join('')||'<p>Aún no hay pedidos confirmados.</p>'}</div>`;
  }
  if (selectedTab === 'ped') {
    const now=new Date();
    const cy=now.getFullYear();
    let from,to,label;
    if (customerPeriod==='month') {
      const d=new Date(cy,now.getMonth()+customerOffset,1);
      from=ymd(d); to=ymd(new Date(d.getFullYear(),d.getMonth()+1,0));
      label=d.toLocaleDateString('es-CO',{month:'long',year:'numeric'});
    } else if(customerPeriod==='quarter') {
      const q=Math.floor(now.getMonth()/3)*3+customerOffset*3;
      const first=new Date(cy,q,1);
      const quarterStart=Math.floor(first.getMonth()/3)*3;
      from=ymd(new Date(first.getFullYear(),quarterStart,1));
      to=ymd(new Date(first.getFullYear(),quarterStart+3,0));
      label='Trimestre '+(quarterStart/3+1)+' de '+first.getFullYear();
    } else if(customerPeriod==='year') {
      const year=cy+customerOffset;
      from=year+'-01-01';to=year+'-12-31';label='Año '+year;
    } else if(customerPeriod==='specific') {
      const d=/^\d{4}-\d{2}$/.test(customerMonth)?customerMonth:ymd(now).slice(0,7);
      const [y,m]=d.split('-').map(Number);
      from=ymd(new Date(y,m-1,1));to=ymd(new Date(y,m,0));label=d;
    }
    const report=await api('/admin/customers?'+new URLSearchParams({from,to}));
    const clients=report.customers||[];
    const btns=[['month','Mes'],['quarter','Trimestre'],['year','Año'],['specific','Elegir mes']];
    const csv='/api/admin/customers.csv?'+new URLSearchParams({from,to,segment:customerSegment});
    body=`<div class="panel"><div class="sec-h"><div><h3>Clientes y compras</h3><p>Conoce qué compran tus clientes y encuentra oportunidades de recompra. Solo pagos Bold aprobados.</p></div></div>
    <div class="sales-quick" style="margin:14px 0" role="group" aria-label="Período de clientes">${btns.map(([v,t])=>`<button type="button" class="sales-quick-btn ${customerPeriod===v?'selected':''}" aria-pressed="${customerPeriod===v}" data-act="customerperiod" data-arg="${v}">${t}</button>`).join('')}</div>
    <div class="tools" style="margin:12px 0;align-items:end;gap:10px;flex-wrap:wrap">
      ${customerPeriod==='specific'?`<label>Mes <input type="month" id="customer-month" value="${esc(customerMonth||ymd(now).slice(0,7))}"></label>`:`<button type="button" class="pill sm ghost" data-act="customerprev">‹ Anterior</button><button type="button" class="pill sm ghost" data-act="customercurrent">Actual</button><button type="button" class="pill sm ghost" data-act="customernext">Siguiente ›</button>`}
      <b style="padding:8px">${esc(label)}</b>
    </div>
    <div class="stats" style="margin:16px 0"><div class="stat">Clientes que compraron<b>${clients.length}</b></div><div class="stat">Compras aprobadas<b>${report.purchases||0}</b></div><div class="stat">Clientes recurrentes<b>${report.repeat||0}</b></div><div class="stat">Ventas del período<b>${COP(report.revenue||0)}</b></div></div>
    <div class="tools" style="margin:16px 0;gap:12px;align-items:center;flex-wrap:wrap"><input id="customer-search" type="search" placeholder="Buscar nombre, teléfono, documento o producto" value="${esc(customerSearch)}" style="flex:1;min-width:200px"><label>Segmento <select id="customer-filter"><option value="all" ${customerSegment==='all'?'selected':''}>Todos</option><option value="repeat" ${customerSegment==='repeat'?'selected':''}>Recurrentes (2+)</option><option value="single" ${customerSegment==='single'?'selected':''}>Una compra</option></select></label><a id="customer-export" class="pill sm ghost" href="${esc(csv)}">⬇ Exportar clientes CSV</a></div>
    <p id="customer-count" style="color:var(--mut);font-size:13px;margin-bottom:10px">Mostrando ${clients.length} clientes · ${esc(from)} a ${esc(to)}</p>
    <div id="customer-list">${clients.map(c=>`<div class="ord customer-record" data-search="${esc([c.name,c.tel,c.documentNumber,...c.products.map(p=>p.name)].join(' ').toLowerCase())}" data-count="${c.purchases}" style="padding:14px 0;border-bottom:1px solid var(--line,#ddd)">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(c.name)}</b><strong style="color:#59318b">${c.purchases>=2?'⭐ Recurrente':'Cliente'}</strong></div>
      <div>${esc(c.tel)} · ${c.documentNumber?esc((c.documentType||'Documento')+' '+c.documentNumber):'Documento no disponible'}</div>
      <small><b>${c.purchases} compra(s)</b> · ${COP(c.spent)} gastados en este período · Última: ${esc(c.lastPurchase)}</small>
      <div style="margin-top:9px"><b>Productos comprados:</b> ${c.products.map(p=>`<span style="display:inline-block;margin:3px 5px 3px 0;padding:5px 9px;border-radius:12px;background:#f3ebf9;color:#492768;font-size:12px">${p.quantity} × ${esc(p.name)}</span>`).join('')}</div>
      <details style="margin-top:7px"><summary style="cursor:pointer">Ver detalle de ${c.orders.length} compra(s)</summary>${c.orders.map(o=>`<div style="padding:7px 0"><small><b>${esc(o.id)}</b> · ${COP(o.total)} · ${esc(o.date)}</small><div><small>${o.products.map(p=>`${p.quantity} × ${esc(p.name)}`).join(' · ')}</small></div></div>`).join('')}</details>
    </div>`).join('')||'<p>No hay clientes con compras aprobadas en este período.</p>'}</div>
    <p style="font-size:12px;color:var(--mut)">Exportar clientes no equivale a autorización para enviar campañas. Envía publicidad únicamente a contactos con consentimiento verificable. La descarga incluye datos personales: consérvala de forma segura.</p></div>`;
  }
  if (selectedTab === 'ban') {
    const sl = await api('/admin/slides');
    window.__bannerSlides=sl;
    const promos = await api('/admin/side-promos');
    body = `<div class="panel"><div class="sec-h"><div><h3>Banners de la página principal</h3><p style="color:var(--mut);margin:6px 0 0">Edita cada promoción y comprueba su aspecto antes de guardar. No necesitas conocimientos técnicos.</p></div><a class="pill sm ghost" href="#">Ver tienda</a></div>
    <div class="banner-admin-list">${sl.map(slideMediaEditor).join('')}</div><h3 style="margin:28px 0 6px">Promociones debajo del banner</h3><p style="color:var(--mut);margin:0 0 16px">Estas dos promociones también se editan aquí. Cada una tiene su propio texto, destino y color.</p><div class="side-promo-admin">${promos.map((p,i)=>`<form class="side-promo-editor" data-form="sidepromo" data-index="${i}"><div class="side-promo-head"><b>Tarjeta ${i+1}</b><label class="banner-switch"><input type="checkbox" name="active" ${p.active?'checked':''}> Visible</label></div><div class="side-promo-preview mp mp-theme-${esc(p.theme)}"><small data-sp="eyebrow">${esc(p.eyebrow)}</small><h3 data-sp="title">${esc(p.title)}</h3><span data-sp="cta">${esc(p.cta)}</span></div><div class="banner-fields">${bannerMediaEditor(p)}${bannerDestinationFields(p)}<label class="fld">Texto pequeño<input name="eyebrow" maxlength="40" value="${esc(p.eyebrow)}"></label><label class="fld">Título de la tarjeta<input name="title" required maxlength="90" value="${esc(p.title)}"></label><label class="fld">Texto del enlace<input name="cta" required maxlength="40" value="${esc(p.cta)}"></label><label class="fld">¿Qué productos abre?<select name="category"><option value="">Todos los productos</option>${S.categories.map(c=>`<option value="${esc(c[0])}" ${c[0]===p.category?'selected':''}>${esc(c[0])}</option>`).join('')}</select></label><label class="fld">Color de la tarjeta<select name="theme">${[['morado','Rojo Galope'],['crema','Crema'],['rosa','Carbón'],['lavanda','Gris cálido']].map(([v,t])=>`<option value="${v}" ${p.theme===v?'selected':''}>${t}</option>`).join('')}</select></label><button class="pill pk">Guardar tarjeta ${i+1}</button></div></form>`).join('')}</div></div>`;
  }
  if (selectedTab === 'aju') {
    const s = await api('/admin/settings');
    body = `<form class="panel" data-form="settings"><h3>Ajustes de la tienda</h3><div class="two"><label class="fld">Nombre<input name="name" maxlength="60" value="${esc(s.name)}"></label><label class="fld">WhatsApp (con indicativo, sin +)<input name="wa" inputmode="numeric" maxlength="15" value="${esc(s.wa)}"></label><input type="hidden" name="free" value="0"><label class="fld">Mensaje de la barra superior<input name="note" maxlength="160" value="${esc(s.note)}"></label></div>
<h3 style="margin:22px 0 8px">¿Por qué comprar con nosotros? · Beneficios</h3><p style="color:var(--mut)">Activa los que realmente ofrece Galope. Puedes modificar su título, descripción e ícono. No anuncies contraentrega si no está habilitado.</p><div class="benefits-admin">${(s.benefits||[]).map((benefit)=>`<div class="benefit-admin-card"><label class="banner-switch"><input name="ben_active_${benefit.id}" type="checkbox" ${benefit.active?'checked':''}> Mostrar en la tienda</label><label class="fld">Título<input name="ben_title_${benefit.id}" value="${esc(benefit.title)}" maxlength="45" required></label><label class="fld">Descripción<input name="ben_desc_${benefit.id}" value="${esc(benefit.description)}" maxlength="95"></label><label class="fld">Ícono<select name="ben_icon_${benefit.id}">${[['truck','Camión / envío'],['credit-card','Tarjeta / pagos'],['heart-handshake','Atención'],['messages-square','Conversación'],['package-check','Paquete'],['shield-check','Seguridad'],['gift','Regalo'],['store','Tienda']].map(([id,name])=>`<option value="${id}" ${benefit.icon===id?'selected':''}>${name}</option>`).join('')}</select></label></div>`).join('')}</div>
<h3 style="margin:20px 0 8px">Entrega y retiro de pedidos</h3><p style="color:var(--mut)">En el checkout se cobra solo el valor de los productos. Después de verificar el pago, un asesor cotiza el envío y comunica su valor al comprador para que lo acepte antes de despachar.</p><div class="two"><label class="fld"><span>Retiro en tienda · disponible</span><input name="pickupAddress" value="${esc(s.shipping?.pickupAddress||'')}" placeholder="Dirección y horario para recoger"></label><label class="fld"><span>Envío a domicilio · disponible</span><input name="carrier" value="${esc(s.shipping?.carrier||'')}" placeholder="Transportadora (ej. Coordinadora)"></label><input type="hidden" name="deliveryFee" value="0"><label class="fld">Tiempo estimado de entrega<input name="estimatedDays" value="${esc(s.shipping?.estimatedDays||'')}" placeholder="Ej. 2 a 5 días hábiles"></label></div><p style="color:var(--mut)"><b>Pagos:</b> Bold y Addi solo deben mostrarse como disponibles cuando se complete la integración oficial. No solicites tarjetas en este sitio.</p><h3 style="margin:18px 0 8px">Métodos de pago</h3>${s.pay.map((m) => `<div class="two" style="align-items:end"><label class="fld"><span><input type="checkbox" name="pon_${esc(m.id)}" ${m.on ? 'checked' : ''}> Activo</span><input name="pn_${esc(m.id)}" maxlength="60" value="${esc(m.name)}"></label><label class="fld">Instrucción para el cliente<input name="pd_${esc(m.id)}" maxlength="160" value="${esc(m.desc)}"></label></div>`).join('')}<button class="pill pk">Guardar ajustes</button></form>`;
    window.__payIds = s.pay.map((m) => m.id);
  }
  if (selectedTab === 'sus') {
    const ss = await api('/admin/subscribers');
    const cd = await api('/admin/campaigns');
    const bs = await api('/admin/broadcast/summary');
    const messaging = await api('/admin/messaging/status');
    const eligible = ss.filter(s => s.consent && s.status === 'active');
    const counts = {hombre:0,mujer:0,ambos:0}; eligible.forEach(s => counts[s.interest] = (counts[s.interest]||0)+1);
    body = `<div class="panel"><h3>Club Galope · Fidelización</h3><p style="color:var(--mut)">Organiza clientes interesados y prepara promociones segmentadas. Los mensajes no se envían desde esta versión.</p>
    <div class="club-stats"><div><b>${ss.length}</b><small>Contactos</small></div><div><b>${eligible.length}</b><small>Autorizados</small></div><div><b>${counts.hombre + counts.ambos}</b><small>Interés Hombre</small></div><div><b>${counts.mujer + counts.ambos}</b><small>Interés Mujer</small></div></div>
    <h3 style="margin-top:25px">Audiencias de difusión · WhatsApp Business</h3>
    <p style="color:var(--mut)">Clasificación automática. Descarga las altas o bajas pendientes, actualiza manualmente las listas en WhatsApp Business y confirma únicamente después de hacerlo. No se envía ningún mensaje desde aquí.</p>
    <div class="club-stats">${['hombre','mujer'].map(w=>`<div style="text-align:left"><b style="font-size:16px">${w==='hombre'?'Hombre':'Mujer'}</b><small>${bs.worlds[w].add} para añadir · ${bs.worlds[w].remove} para retirar</small><div class="tools" style="margin-top:9px;flex-wrap:wrap"><button class="pill sm ghost" data-act="bdraft" data-arg="${w}:add" ${bs.worlds[w].add?'':'disabled'}>Preparar altas</button><button class="pill sm ghost" data-act="bdraft" data-arg="${w}:remove" ${bs.worlds[w].remove?'':'disabled'}>Preparar bajas</button></div></div>`).join('')}</div>
    ${bs.pendingBatches.length?`<h4 style="margin:16px 0 8px">Archivos pendientes de confirmar</h4>${bs.pendingBatches.map(b=>`<div class="club-campaign-row"><div><b>${b.world==='hombre'?'Hombre':'Mujer'} · ${b.operation==='add'?'Incorporar':'Retirar'}</b><br><small>${b.count} contactos · Lote #${b.id}</small></div><div class="tools"><a class="pill sm ghost" href="/api/admin/broadcast/batches/${b.id}.csv">Descargar CSV</a><button class="pill sm pk" data-act="bconfirm" data-arg="${b.id}">Confirmar gestión</button></div></div>`).join('')}`:''}
    <h3 style="margin-top:25px">Mensajería futura · API oficial</h3><div class="club-campaign-row"><div><b>Estado: ${messaging.configured?'Configurada':'Pendiente de conexión'}</b><br><small>${esc(messaging.reason)}</small><br><small>Las campañas se guardan como borradores. No hay cobros ni envíos en segundo plano.</small></div><div class="tools"><button class="pill sm ghost" disabled>Enviar campaña (próximamente)</button></div></div>
    <h3 style="margin-top:25px">Nueva campaña (borrador)</h3><form data-form="campaign" class="club-campaign"><label class="fld">Nombre de la campaña<input name="name" required maxlength="80" placeholder="Ej. Novedades de noviembre"></label><label class="fld">Público<select name="audience"><option value="todos">Todos los autorizados</option><option value="hombre">Hombre</option><option value="mujer">Mujer</option></select></label><label class="fld">Mensaje para WhatsApp<textarea name="message" required minlength="5" maxlength="1200" rows="4" placeholder="Hola, tenemos nuevas novedades en Galope..."></textarea></label><div class="campaign-media-box"><div class="campaign-media-head"><div><b>Adjunto opcional</b><br><small>Puedes dejar la campaña lista con una imagen o un video para usarlo cuando se conecte WhatsApp oficialmente.</small></div><label class="pill sm ghost">Adjuntar archivo<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" data-chg="campfile" hidden></label></div><div id="campaign-media-draft" class="campaign-media-draft">${campaignMediaPreview('', '')}</div></div><button class="pill pk">Guardar borrador</button></form>
    <h3 style="margin-top:25px">Campañas guardadas (${cd.campaigns.length})</h3>${cd.campaigns.map(c => `<div class="club-campaign-row club-campaign-row--media"><div><b>${esc(c.name)}</b> · ${c.audience === 'todos'?'Todos':c.audience==='hombre'?'Hombre':'Mujer'}<br><small>${esc(c.message)}</small><br><small>${campaignMediaLabel(c.media_kind)}${c.media_name ? ' · ' + esc(c.media_name) : ''}</small><br><small>Solo borrador · No enviado · <span data-preview-id="${c.id}" class="campaign-preview-label">Audiencia: consultar al abrir</span></small>${c.media_url ? `<div class="campaign-media-inline">${campaignMediaPreview(c.media_url, c.media_kind)}</div>` : ''}</div><div class="tools"><a class="pill sm ghost" href="/api/admin/campaigns/${c.id}/audience.csv">Exportar audiencia autorizada</a><button class="pill sm ghost" data-act="cdel" data-arg="${c.id}">Borrar</button></div></div>`).join('') || '<p style="color:var(--mut)">No hay campañas guardadas.</p>'}
    <h3 style="margin-top:25px">Suscriptores (${ss.length})</h3><div class="tools"><label>Mostrar <select id="sub-filter" data-chg="subfilter"><option value="todos">Todos</option><option value="active">Autorizados activos</option><option value="hombre">Interés Hombre</option><option value="mujer">Interés Mujer</option><option value="pending">Sin autorización</option><option value="unsubscribed">Baja solicitada</option></select></label><input id="sub-search" data-input="subsearch" placeholder="Buscar nombre o celular" aria-label="Buscar suscriptor"></div><div id="sub-list">${subscriberRows(ss)}</div></div>`;
    window.__clubSubscribers = ss;
    window.__campaignDraftMedia = null;
  }
  if(renderRun!==adminRenderRun || location.hash!=='#admin')return;
  await adminShell(body);
}

function campaignMediaLabel(kind) {
  return kind === 'video' ? 'Video adjunto' : kind === 'image' ? 'Imagen adjunta' : 'Sin adjunto';
}
function campaignMediaPreview(mediaUrl, mediaKind) {
  if (!mediaUrl) return '<div class="campaign-media-empty">Sin imagen ni video adjunto.</div>';
  if (mediaKind === 'video') return `<video class="campaign-media-preview" src="${esc(mediaUrl)}" controls preload="metadata"></video>`;
  return `<img class="campaign-media-preview" src="${esc(mediaUrl)}" alt="Adjunto de campaña" loading="lazy">`;
}

/* ---------- Productos ---------- */
function pedit(id) {
  const p = id ? AP.find((x) => x.id === +id) : { name: '', cat: S.categories[0][0], categories: [S.categories[0][0]], world: 'hombre', ageMin: 0, ageMax: 36, price: '', old: '', stock: 0, badge: '', desc: '', emoji: '🤠', active: true, imgs: [], feats: [] };
  imgsD = [...p.imgs];
  const badges = BADGES.includes(p.badge) ? BADGES : [...BADGES, p.badge];
  $('#modal').className = 'modal';
  $('#modal').innerHTML = `<button class="x" data-act="close" aria-label="Cerrar">✕</button><h2 style="font-size:28px;margin-bottom:12px">${id ? 'Editar' : 'Nuevo'} producto</h2><form data-form="product" data-id="${id || ''}"><div class="two">
<label class="fld">Nombre<input name="name" required minlength="2" maxlength="120" value="${esc(p.name)}"></label><fieldset class="fld multi-categories"><legend>Categorías (puedes elegir varias)</legend><div class="multi-cat-options">${S.categories.map((c) => `<label><input type="checkbox" name="categories" value="${esc(c[0])}" ${(p.categories || [p.cat]).includes(c[0]) ? 'checked' : ''}> ${esc(c[0])}</label>`).join('')}</div></fieldset>
<label class="fld">Público<select name="world" required><option value="hombre" ${p.world === 'hombre' ? 'selected' : ''}>Hombre</option><option value="mujer" ${p.world === 'mujer' ? 'selected' : ''}>Mujer</option><option value="unisex" ${p.world === 'unisex' ? 'selected' : ''}>Unisex</option></select></label>
<input type="hidden" name="ageMin" value="0"><input type="hidden" name="ageMax" value="216">
<label class="fld">Precio ($)<input name="price" type="number" min="0" step="1" required value="${p.price}"></label><label class="fld">Precio anterior ($, opcional)<input name="old" type="number" min="0" step="1" value="${p.old || ''}"></label>
<label class="fld">Unidades disponibles (0 = Agotado)<input name="stock" type="number" min="0" step="1" required value="${p.stock}"></label><label class="fld">Etiqueta<select name="badge">${badges.map((b) => `<option ${b === p.badge ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>
<label class="fld">Emoji (si no hay foto)<input name="emoji" maxlength="4" value="${esc(p.emoji)}"></label><label class="fld">Fotos (hasta 4 · JPG, PNG o WebP)<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-chg="pick"></label></div><div id="gp" class="gp"></div>
<details class="photo-storage-note"><summary>¿Cuántas fotos puedo almacenar sin coste de R2?</summary><p>R2 Standard incluye una cuota de <strong>10 GB-mes de almacenamiento al mes</strong>. Si cada foto optimizada pesa 500 KB, equivale aproximadamente a <strong>20.000 fotos almacenadas durante un mes completo</strong>, siempre que toda esa cuota esté disponible para imágenes.</p><p>Es una estimación, no un contador de espacio disponible ni una garantía de gratuidad. La cuota se comparte entre los buckets de la cuenta; los videos y otros archivos también consumen espacio. R2 incluye además 1 millón de operaciones de clase A y 10 millones de clase B al mes; el exceso se factura. Otros servicios de la tienda pueden tener costes.</p><p>Este formulario admite <strong>hasta 4 fotos por producto</strong>. Consulta el consumo real en Cloudflare y las <a href="https://developers.cloudflare.com/r2/pricing/" target="_blank" rel="noopener noreferrer">tarifas oficiales de R2</a>.</p></details>
<label class="fld">Descripción<textarea name="desc" rows="3" maxlength="1000">${esc(p.desc)}</textarea></label><label class="fld">Características (una por línea)<textarea name="feats" rows="4">${esc(p.feats.join('\n'))}</textarea></label><label style="display:flex;gap:8px;margin-bottom:12px"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}> Visible en la tienda</label><button class="pill pk">Guardar producto</button></form>`;
  openPanel($('#modal')); gp();
}
function gp() {
  $('#gp').innerHTML = imgsD.map((x, i) => `<div class="gi">${pic(x, 'Foto ' + (i + 1))}${i ? '' : '<em>Portada</em>'}<div><button type="button" data-act="imgmain" data-arg="${i}" ${i ? '' : 'disabled'}>Portada</button><button type="button" data-act="imgdel" data-arg="${i}">Quitar</button></div></div>`).join('') +
    `<small style="align-self:center;color:var(--mut)">${imgsD.length}/4 fotos · la primera es la portada</small>`;
}
async function pickFiles(input) {
  const fs = [...input.files].slice(0, 4 - imgsD.length); input.value = '';
  if (!fs.length) return toast('Máximo 4 fotos por producto');
  toast('Subiendo…');
  for (const f of fs) {
    const form = new FormData(); form.append('file', f);
    try { const r = await api('/admin/uploads', { method: 'POST', form }); if (imgsD.length < 4) imgsD.push(r.url); gp(); }
    catch (e) { toast(e.message); }
  }
}
async function saveProduct(form, btn) {
  const f = new FormData(form), id = form.dataset.id;
  const body = {
    name: f.get('name'), cat: f.getAll('categories')[0], categories: f.getAll('categories'), world: f.get('world'), ageMin: f.get('ageMin'), ageMax: f.get('ageMax'), price: f.get('price'), old: f.get('old'), stock: f.get('stock'), badge: f.get('badge'),
    emoji: f.get('emoji'), desc: f.get('desc'), active: f.has('active'), imgs: imgsD,
    feats: String(f.get('feats')).split('\n').map((x) => x.trim()).filter(Boolean),
  };
  if (!body.categories.length) return toast('Selecciona al menos una categoría');
  if (Number(body.ageMin) > Number(body.ageMax)) return toast('La edad mínima no puede ser mayor que la edad máxima');
  await busy(btn, async () => {
    await api('/admin/products' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body });
    closeAll(); await renderTab(); await loadStore().catch(() => {}); toast('Producto guardado');
  });
}
async function pdel(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try { await api('/admin/products/' + id, { method: 'DELETE' }); await renderTab(); toast('Producto eliminado'); } catch (e) { toast(e.message); }
}

/* ---------- Otros formularios ---------- */
function slideMediaEditor(s,i) {
  const original=s.bg==='photo'?'/img/club-galope.webp':'/img/'+s.img+'.webp';
  return `<form class="banner-editor" data-form="slide" data-id="${s.id}"><div class="banner-editor-top"><strong>Banner ${i+1}</strong><label class="banner-switch"><input type="checkbox" name="active" ${s.active?'checked':''}> Mostrar en la tienda</label></div><p class="banner-hint">Se muestra únicamente tu imagen o video. Incluye en el diseño los textos y el botón que quieras ver. La imagen completa enlaza al producto elegido.</p><div class="banner-editor-grid"><div>${bannerMediaEditor({...s,mediaFit:'artwork'},original)}</div><div class="banner-fields"><label class="fld">Nombre para identificar este banner<input name="title" required minlength="2" maxlength="90" value="${esc(s.title)}"><small>Este nombre no aparece sobre la imagen.</small></label>${bannerDestinationFields(s)}<label class="fld">Categoría alternativa si no eliges un producto<select name="cat"><option value="">Todos los productos</option>${S.categories.map(c=>`<option value="${esc(c[0])}" ${c[0]===s.cat?'selected':''}>${esc(c[0])}</option>`).join('')}</select></label><button class="pill pk" type="submit">Guardar banner ${i+1}</button></div></div></form>`;
}

function bannerDestinationFields(b) {
  return `<label class="fld">Enlazar a un producto de la tienda<select data-chg="bannerproduct"><option value="">Elegir producto…</option>${S.products.map(p=>`<option value="#producto-${p.id}" ${String(b.buttonUrl||'').endsWith('#producto-'+p.id)?'selected':''}>${esc(p.name)}</option>`).join('')}</select><small>El banner abre directamente el producto que elijas.</small></label><label class="fld">URL del producto o destino del botón<input name="buttonUrl" type="text" maxlength="2000" value="${esc(b.buttonUrl||'')}" placeholder="https://tutienda.com/#producto-123"><small>La URL tiene prioridad sobre la categoría. También puedes copiar el enlace desde la ficha del producto o elegirlo en la lista.</small></label>`;
}
function bannerMediaEditor(b,original='') {
  const url=b.customImage||original;
  return `<div class="banner-media-editor" data-original="${esc(original)}"><div class="banner-editor-visual"><div class="banner-media-preview">${url?bannerMedia(url,b.mediaFit,b.title):'<p>Sin foto o video</p>'}</div><div class="banner-editor-copy ${b.textTheme==='claro'?'preview-light':'preview-dark'}"><small data-preview-tag>${esc(b.tag||b.eyebrow||'')}</small><b data-preview-title>${esc(b.title)}</b><span data-preview-sub>${esc(b.sub||'')}</span><div data-preview-off>${bannerOffer(b)}</div></div></div><label class="banner-upload pill sm ghost">Cambiar foto o video<input hidden type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" data-chg="bannerfile"></label><button type="button" class="pill sm ghost" data-act="bannerreset">${original?'Usar foto original':'Quitar foto o video'}</button><input type="hidden" name="customImage" value="${esc(b.customImage||'')}"><label class="fld">Ajuste de la foto o video<select name="mediaFit" data-chg="bannerfit"><option value="contain" ${!['cover','artwork'].includes(b.mediaFit)?'selected':''}>Mostrar completo (sin recortar)</option><option value="cover" ${b.mediaFit==='cover'?'selected':''}>Foto o video de fondo con textos superpuestos</option><option value="artwork" ${b.mediaFit==='artwork'?'selected':''}>Diseño completo: la imagen ya incluye texto y botón</option></select></label>${original?`<div class="banner-mobile-editor"><b>Versión para celular (opcional)</b><div class="banner-mobile-preview">${b.mobileImage?bannerMedia(b.mobileImage,b.mediaFit,'Vista previa móvil'):'Se usará el archivo de escritorio'}</div><input type="hidden" name="mobileImage" value="${esc(b.mobileImage||'')}"><label class="banner-upload pill sm ghost">Cargar foto o video móvil<input hidden type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" data-chg="bannerfile" data-banner-target="mobileImage"></label><button type="button" class="pill sm ghost" data-act="bannermobilereset">Usar el de escritorio</button></div>`:''}<p class="banner-hint">Campaña recomendada: 1920 × 600 px en escritorio y 800 × 1000 px en celular. ${original?'El banner muestra únicamente el archivo que subas; incluye en él sus textos y botón.':'Si la tarjeta ya incluye textos, elige «Diseño completo». '} Fotos JPG, PNG o WebP hasta 6 MB. Videos MP4 (H.264 recomendado) o WebM hasta 20 MB. Usa una pieza panorámica de 1920 × 600 px para llenar el banner sin recortes. La versión móvil recomendada es 800 × 1000 px.</p></div>`;
}
async function uploadBannerImage(input) {
  const file=input.files?.[0]; input.value=''; if(!file)return;
  const form=input.closest('form'),editor=input.closest('.banner-media-editor');
  const video=['video/mp4','video/webm'].includes(file.type);
  if(!video&&!['image/jpeg','image/png','image/webp'].includes(file.type))return toast('Usa JPG, PNG, WebP, MP4 o WebM');
  if(file.size>(video?20:6)*1024*1024)return toast(video?'El video supera 20 MB':'La foto supera 6 MB');
  const btn=form.querySelector('button[type="submit"],button.pill.pk');
  input.disabled=true;
  await busy(btn,async()=>{
    const data=new FormData();data.append('file',file);
    const result=await api('/admin/banner-media',{method:'POST',form:data});
    editor.querySelector('[name="'+(input.dataset.bannerTarget||'customImage')+'"]').value=result.url;
    editor.querySelector(input.dataset.bannerTarget==='mobileImage'?'.banner-mobile-preview':'.banner-media-preview').innerHTML=bannerMedia(result.url,form.elements.mediaFit.value,'Vista previa');
    toast('Archivo cargado. Guarda el banner para publicar el cambio.');
  });
  input.disabled=false;
}
function resetBannerImage(button) {
  const editor=button.closest('form').querySelector('.banner-media-editor');
  editor.querySelector('[name="customImage"]').value='';
  editor.querySelector('.banner-media-preview').innerHTML=editor.dataset.original?bannerMedia(editor.dataset.original,'contain','Vista previa'):'<p>Sin foto o video</p>';
  toast('Vista previa restaurada. Guarda para confirmar.');
}
async function saveSidePromo(form, btn) {
  const f=new FormData(form);
  await busy(btn,async()=>{
    await api('/admin/side-promos/'+form.dataset.index,{method:'PUT',body:{customImage:f.get('customImage'),buttonUrl:f.get('buttonUrl'),mediaFit:f.get('mediaFit'),eyebrow:f.get('eyebrow'),title:f.get('title'),cta:f.get('cta'),category:f.get('category'),theme:f.get('theme'),active:f.has('active')}});
    toast('Tarjeta lateral guardada'); await loadStore().catch(()=>{}); await renderTab();
  });
}
async function saveSlide(form, btn) {
  const f=new FormData(form), original=(window.__bannerSlides||[]).find(s=>String(s.id)===form.dataset.id)||{};
  const body={...original,...Object.fromEntries(f.entries()),active:f.has('active'),mediaFit:'artwork',timer:false};
  await busy(btn, async () => { await api('/admin/slides/' + form.dataset.id, { method: 'PUT', body }); toast('Banner actualizado'); await loadStore().catch(()=>{}); });
}
async function saveSettings(form, btn) {
  const f = new FormData(form);
  const body = { name: f.get('name'), wa: f.get('wa'), free: f.get('free'), note: f.get('note'),
    benefits: (S.settings.benefits||[]).map((b) => ({id:b.id,active:f.has('ben_active_'+b.id),title:f.get('ben_title_'+b.id),description:f.get('ben_desc_'+b.id),icon:f.get('ben_icon_'+b.id)})),
    pay: window.__payIds.map((id) => ({ id, on: f.has('pon_' + id), name: f.get('pn_' + id), desc: f.get('pd_' + id) })),
    shipping: { pickupEnabled:true, pickupAddress:f.get('pickupAddress'), deliveryEnabled:true, carrier:f.get('carrier'), deliveryFee:0, estimatedDays:f.get('estimatedDays') } };
  await busy(btn, async () => { await api('/admin/settings', { method: 'PUT', body }); toast('Ajustes guardados'); await loadStore().catch(() => {}); });
}
async function setStatus(sel) {
  try { await api('/admin/orders/' + encodeURIComponent(sel.dataset.id), { method: 'PATCH', body: { status: sel.value } }); toast('Pedido actualizado'); }
  catch (e) { toast(e.message); await renderTab(); }
}
async function sdel(tel) {
  try { await api('/admin/subscribers/' + encodeURIComponent(tel), { method: 'DELETE' }); await renderTab(); } catch (e) { toast(e.message); }
}
async function doLogout() { await api('/auth/logout', { method: 'POST' }); auth=null; await admin(); }

/* Club Galope */
function subscriberRows(rows) {
  return rows.map(s=>`<div class="sub-row" data-club-tel="${esc(s.tel)}" data-club-state="${esc(s.status)}" data-club-interest="${esc(s.interest)}"><span><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.tel)}</b><br><small>${s.interest==='hombre'?'Hombre':s.interest==='mujer'?'Mujer':'Ambos'} · ${s.consent && s.status==='active'?'✓ Autorizado':s.status==='unsubscribed'?'Baja':'Sin autorización'} · ${esc(s.created_at)}</small></span><div class="tools">${s.status==='active'?`<button class="pill sm ghost" data-act="suboff" data-arg="${esc(s.tel)}">Dar de baja</button>`:''}<button class="pill sm ghost" data-act="sdel" data-arg="${esc(s.tel)}">Eliminar</button></div></div>`).join('') || '<p style="color:var(--mut)">Sin contactos para mostrar.</p>';
}
function filterSubscribers() {
  const rows=window.__clubSubscribers||[];
  const filter=document.querySelector('#sub-filter')?.value||'todos';
  const q=(document.querySelector('#sub-search')?.value||'').trim();
  const found=rows.filter(s=> (!q||s.tel.includes(q)||(s.name||'').toLowerCase().includes(q)) && (filter==='todos'|| (filter==='active'&&s.consent&&s.status==='active') || (filter==='pending'&&!s.consent) || (filter==='unsubscribed'&&s.status==='unsubscribed') || (['hombre','mujer'].includes(filter)&&s.status==='active'&&s.consent&&(s.interest===filter||s.interest==='ambos'))));
  const root=document.querySelector('#sub-list');if(root)root.innerHTML=subscriberRows(found);
}
async function saveCampaign(form,btn) {
  const f=new FormData(form);
  const media = window.__campaignDraftMedia || null;
  await busy(btn,async()=>{await api('/admin/campaigns',{method:'POST',body:{name:f.get('name'),audience:f.get('audience'),message:f.get('message'),mediaUrl: media?.url || '', mediaKind: media?.kind || '', mediaName: media?.name || ''}});window.__campaignDraftMedia=null;toast('Borrador guardado. No se envió ningún mensaje.');await renderTab();});
}
async function cdel(id){if(!confirm('¿Eliminar borrador?'))return;try{await api('/admin/campaigns/'+encodeURIComponent(id),{method:'DELETE'});await renderTab();}catch(e){toast(e.message)}}
async function suboff(tel){if(!confirm('¿Dar de baja este contacto de las promociones?'))return;try{await api('/admin/subscribers/'+encodeURIComponent(tel),{method:'PATCH',body:{status:'unsubscribed'}});await renderTab();}catch(e){toast(e.message)}}

async function pickCampaignMedia(input) {
  const file = input.files && input.files[0];
  input.value = '';
  if (!file) return;
  const holder = document.querySelector('#campaign-media-draft');
  if (holder) holder.innerHTML = '<div class="campaign-media-empty">Subiendo archivo…</div>';
  const form = new FormData();
  form.append('file', file);
  try {
    const r = await api('/admin/campaign-media', { method: 'POST', form });
    window.__campaignDraftMedia = { url: r.url, kind: r.kind, name: r.originalName || file.name };
    if (holder) holder.innerHTML = `<div class="campaign-media-meta"><b>${campaignMediaLabel(r.kind)}</b><small>${esc(window.__campaignDraftMedia.name || '')}</small></div>${campaignMediaPreview(r.url, r.kind)}<div class="tools" style="margin-top:10px"><button type="button" class="pill sm ghost" data-act="campmediaremove">Quitar adjunto</button></div>`;
    toast(r.kind === 'video' ? 'Video adjuntado al borrador' : 'Imagen adjuntada al borrador');
  } catch (e) {
    window.__campaignDraftMedia = null;
    if (holder) holder.innerHTML = campaignMediaPreview('', '');
    toast(e.message);
  }
}
function removeCampaignMedia() {
  window.__campaignDraftMedia = null;
  const holder = document.querySelector('#campaign-media-draft');
  if (holder) holder.innerHTML = campaignMediaPreview('', '');
  toast('Adjunto retirado del borrador');
}

async function bdraft(arg) {
  const [world,operation]=String(arg).split(':');
  try {
    const result=await api('/admin/broadcast/batches',{method:'POST',body:{world,operation}});
    await renderTab();
    const link=document.createElement('a');link.href='/api/admin/broadcast/batches/'+result.id+'.csv';link.download='';document.body.append(link);link.click();link.remove();
    toast('Archivo preparado. Confirma solo después de actualizar WhatsApp Business.');
  }catch(e){toast(e.message)}
}
async function bconfirm(id) {
  if(!confirm('¿Ya incorporaste o retiraste TODOS estos contactos en WhatsApp Business? Esta confirmación NO significa que se enviaron mensajes.'))return;
  try{await api('/admin/broadcast/batches/'+encodeURIComponent(id)+'/confirm',{method:'POST',body:{}});await renderTab();toast('Gestión registrada.');}catch(e){toast(e.message)}
}

/* ---------- Conciliación de pagos desde el administrador ---------- */
// Retroalimentación visual inmediata durante operaciones de red con Bold.
let boldPaymentsBusy = false;
function boldLoading(button, label) {
  if (!button) return () => {};
  if (!document.getElementById('galope-bold-loading-style')) {
    const style=document.createElement('style');
    style.id='galope-bold-loading-style';
    style.textContent='@keyframes galopeBoldSpin{to{transform:rotate(360deg)}} .galope-bold-spinner{display:inline-block;width:14px;height:14px;margin-right:7px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-2px;animation:galopeBoldSpin .7s linear infinite}';
    document.head.appendChild(style);
  }
  const original=button.innerHTML;
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  button.style.cursor='wait';
  button.innerHTML='<span class="galope-bold-spinner" aria-hidden="true"></span>'+label;
  return () => {
    if(!button.isConnected) return;
    button.innerHTML=original;
    button.disabled=false;
    button.removeAttribute('aria-busy');
    button.style.cursor='';
  };
}
async function refreshBoldAdminPayments() {
  if (boldPaymentsBusy || tab!=='pag') return;
  boldPaymentsBusy=true;
  const restore=boldLoading(document.querySelector('[data-act="refreshpayments"]'),'Actualizando...');
  try {
    await renderTab();
    toast('Lista de pagos actualizada');
  } catch (e) {
    toast('No se pudo actualizar: '+e.message);
  } finally {
    restore();
    boldPaymentsBusy=false;
  }
}
async function verifyBoldAdminPayment(id) {
  if (boldPaymentsBusy || tab!=='pag') return;
  boldPaymentsBusy=true;
  const button=Array.from(document.querySelectorAll('[data-act="verifyboldpayment"]')).find(b=>b.dataset.arg===id);
  const restore=boldLoading(button,'Verificando pago...');
  try {
    const result=await api('/admin/bold-payments/'+encodeURIComponent(id)+'/verify',{method:'POST',body:{}});
    await renderTab();
    toast(result.status==='PAID'?'Pago confirmado por Bold':result.status==='REJECTED'?(result.stockReleased?'Pago rechazado: reserva liberada':'Rechazo recibido: verificando reserva'):'El pago continúa pendiente');
  } catch (e) {
    const row=button?.closest('.ord');
    if(row){let alert=row.querySelector('.payment-error');if(!alert){alert=document.createElement('p');alert.className='payment-error';alert.setAttribute('role','alert');row.appendChild(alert);}alert.textContent='No se pudo verificar: '+e.message;}
    toast('No se pudo verificar. Revisa el detalle debajo del pago.');
  } finally {
    restore();
    boldPaymentsBusy=false;
  }
}

// Filtros visibles sin cargar nuevamente toda la pantalla.
document.addEventListener('input', event => {
  if (event.target?.id === 'customer-search') {
    customerSearch=event.target.value;
    filterGalopeCustomers();
  }
});
document.addEventListener('change', event => {
  if (event.target?.id === 'customer-filter') {
    customerSegment=event.target.value;
    filterGalopeCustomers();
  }
  if (event.target?.id === 'customer-month') {
    customerMonth=event.target.value;
    renderTab().catch(e=>toast(e.message));
  }
});
function filterGalopeCustomers() {
  const q=customerSearch.trim().toLocaleLowerCase('es-CO');
  let shown=0;
  document.querySelectorAll('.customer-record').forEach(node => {
    const n=Number(node.dataset.count);
    const ok=node.dataset.search.includes(q) && (customerSegment==='all'||(customerSegment==='repeat'&&n>=2)||(customerSegment==='single'&&n===1));
    node.hidden=!ok;node.style.display=ok?'':'none';if(ok)shown++;
  });
  const el=document.querySelector('#customer-count');
  if(el) el.textContent=shown+' cliente(s) visibles';
  const url=document.querySelector('#customer-export');
  if(url){const u=new URL(url.href);u.searchParams.set('segment',customerSegment);url.href=u.pathname+u.search;}
}
