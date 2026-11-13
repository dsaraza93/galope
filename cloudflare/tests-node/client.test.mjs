import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function client(fetch){const context=vm.createContext({matchMedia:()=>({matches:false}),document:{addEventListener:()=>{}},fetch,FormData,File,sessionStorage:{removeItem:()=>{}}});vm.runInContext(fs.readFileSync('public/js/common.js','utf8'),context);return context;}
test('el cliente envía idempotencia y CSRF sin alterar el cuerpo del carrito',async()=>{
 let captured;const context=client(async(path,options)=>{captured={path,options};return {ok:true,json:async()=>({orderId:'fixture'})};});
 await vm.runInContext("api('/bold/start',{method:'POST',headers:{'Idempotency-Key':'random-client-intent'},body:{items:[{id:1,q:2}]}})",context);
 assert.equal(captured.path,'/api/bold/start');assert.equal(captured.options.headers['Idempotency-Key'],'random-client-intent');assert.equal(captured.options.headers['X-Requested-With'],'galope');assert.equal(captured.options.credentials,'same-origin');assert.deepEqual(JSON.parse(captured.options.body),{items:[{id:1,q:2}]});
});
test('las fotos grandes se normalizan sin enviar EXIF ni perder el adjunto',async()=>{
 let bitmapClosed=false,drawn=false,captured;
 const context=client(async(path,options)=>{captured=options.body;return {ok:true,json:async()=>({url:'fixture'})};});
 context.createImageBitmap=async()=>({width:6000,height:4000,close:()=>{bitmapClosed=true;}});
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{drawn=true;}}),toBlob:fn=>fn(new Blob(['webp-data'],{type:'image/webp'}))};
 context.document={createElement:()=>canvas};context.form=new FormData();context.form.append('file',new File(['original-image'],'photo.jpg',{type:'image/jpeg'}));
 await vm.runInContext("api('/admin/uploads',{method:'POST',form})",context);
 assert.equal(canvas.width,1200);assert.equal(canvas.height,800);assert.ok(drawn&&bitmapClosed);assert.equal(captured.get('file').type,'image/webp');assert.equal(await captured.get('file').text(),'webp-data');
});
test('todos los scripts públicos tienen sintaxis válida',()=>{for(const file of fs.readdirSync('public/js').filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync('public/js/'+file,'utf8'),{filename:file});});
