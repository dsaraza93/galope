import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';

test('la instalación de Galope tiene identidad propia, catálogo llanero y cero pedidos heredados',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  for(const file of fs.readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync('migrations/'+file,'utf8'));
  db.exec(fs.readFileSync('scripts/demo.sql','utf8'));
  const settings=JSON.parse(db.prepare("SELECT value FROM settings WHERE key='store'").get().value);
  assert.equal(settings.name,'Galope Tienda Llanera');assert.equal(settings.wa,'573115044650');
  const products=db.prepare('SELECT * FROM products').all();assert.equal(products.length,12);
  assert.ok(products.some(p=>p.world==='unisex'));assert.ok(products.every(p=>p.stock===0));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM slides').get().n,5);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM slides WHERE active=1').get().n,0);
 } finally {db.close();}
});
function storefront(){
 const nodes=Object.fromEntries(['#grid','#chips','#cnt'].map(k=>[k,{innerHTML:'',textContent:''}]));
 const media=()=>({matches:false,addEventListener:()=>{}});
 const context=vm.createContext({Intl,URL,matchMedia:media,window:{matchMedia:media},setInterval:()=>{},document:{querySelector:s=>nodes[s],querySelectorAll:()=>[],addEventListener:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{}},location:{origin:'https://galope.test',pathname:'/',href:'https://galope.test/'}});
 for(const file of ['common','store'])vm.runInContext(fs.readFileSync('public/js/'+file+'.js','utf8'),context);
 const products=[{id:1,name:'Sombrero hombre',world:'hombre',price:180000,old:0},{id:2,name:'Sombrero mujer',world:'mujer',price:150000,old:0},{id:3,name:'Sombrero unisex',world:'unisex',price:70000,old:85000}].map(p=>({...p,cat:'Sombreros',categories:['Sombreros'],desc:'Tradición llanera',stock:2,imgs:[],feats:[]}));
 context.fixture={products,categories:[['Sombreros','sombreros']],settings:{}};
 vm.runInContext('S=fixture;',context);
 return {context,nodes,run:code=>vm.runInContext(code,context)};
}
test('hombre y mujer incluyen unisex; el filtro unisex y las ofertas son precisos',()=>{
 const f=storefront();
 f.run("world='hombre';renderGrid()");assert.match(f.nodes['#grid'].innerHTML,/Sombrero hombre/);assert.match(f.nodes['#grid'].innerHTML,/Sombrero unisex/);assert.doesNotMatch(f.nodes['#grid'].innerHTML,/Sombrero mujer/);
 f.run("world='mujer';renderGrid()");assert.match(f.nodes['#grid'].innerHTML,/Sombrero mujer/);assert.match(f.nodes['#grid'].innerHTML,/Sombrero unisex/);assert.doesNotMatch(f.nodes['#grid'].innerHTML,/Sombrero hombre/);
 f.run("world='unisex';renderGrid()");assert.match(f.nodes['#grid'].innerHTML,/Sombrero unisex/);assert.equal(f.nodes['#cnt'].textContent,'Unisex · 1 productos');
 f.run("world='';offersOnly=true;renderGrid()");assert.equal(f.nodes['#cnt'].textContent,'Ofertas · 1 productos');assert.doesNotMatch(f.nodes['#grid'].innerHTML,/Sombrero hombre/);
});
