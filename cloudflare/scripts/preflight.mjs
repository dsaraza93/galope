import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const errors=[];if(!c.d1_databases?.find(x=>x.binding==='DB'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x.database_id||'')&&!/^0{8}-/.test(x.database_id)))errors.push('Configura database_id de D1');
if(!c.r2_buckets?.find(x=>x.binding==='MEDIA'&&x.bucket_name))errors.push('Configura el bucket R2');
if(!c.vars?.GOOGLE_CLIENT_ID||!c.vars?.ADMIN_EMAILS)errors.push('Configura GOOGLE_CLIENT_ID y ADMIN_EMAILS');
if(c.vars?.BOLD_MODE==='production'&&(c.vars.BOLD_ENABLE_LIVE_PAYMENTS==='yes'||c.vars.BOLD_PRODUCTION_VERIFIED==='yes')){
 const file=new URL('../payment-verification.private.json',import.meta.url);let report;try{report=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 if(!report||report.verified!==true||!Number.isFinite(Date.parse(report.checkedAt))||!report.account||!report.evidence||['approval','rejection','duplicateWebhook','concurrentStock','amountMismatch','latePayment'].some(k=>report[k]!==true))errors.push('Producción bloqueada: falta evidencia de certificación de pagos en payment-verification.private.json (ver README)');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('Configuración comprobada. No se han ejecutado cobros ni modificado recursos.');
