const root=process.argv[2];if(!root||!/^https?:\/\//.test(root))throw new Error('Uso: npm run smoke -- https://tu-worker.workers.dev');
const base=new URL(root);if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('Usa HTTPS para servidores remotos');
for(const path of ['/','/css/app.css','/js/main.js','/img/logo.webp','/api/store','/api/auth/status','/api/bold/config','/api/addi/status']){
 const r=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(path+' devolvió '+r.status);
 if(path==='/api/store'){const data=await r.json();if(!Array.isArray(data.products)||!data.categories?.length||!Array.isArray(data.slides))throw new Error('Catálogo incompleto');}
 if(path==='/api/auth/status'){const data=await r.json();if(data.mode!=='google'||data.authenticated)throw new Error('Administración pública o modo incorrecto');}
 if(path==='/api/addi/status'&&(await r.json()).checkoutEnabled)throw new Error('Addi debe permanecer pendiente');
 console.log('OK '+path);
}
const denied=await fetch(new URL('/api/admin/products',base));if(denied.status!==401)throw new Error('La administración no está protegida');console.log('OK administración protegida');
console.log('Smoke completado; no se han probado ni realizado cobros.');
