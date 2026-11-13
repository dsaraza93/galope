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
 const nodes=Object.fromEntries(['#grid','#chips','#cnt','#catalog-pagination'].map(k=>[k,{innerHTML:'',textContent:''}]));
 const media=()=>({matches:false,addEventListener:()=>{}});
 const context=vm.createContext({Intl,URL,matchMedia:media,window:{matchMedia:media},setInterval:()=>{},document:{querySelector:s=>nodes[s],querySelectorAll:()=>[],addEventListener:()=>{},getElementById:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},location:{origin:'https://galope.test',pathname:'/',href:'https://galope.test/'}});
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

test('el despliegue inicializa una base migrada y no restaura ejemplos borrados',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  for(const file of fs.readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync('migrations/'+file,'utf8'));
  const bootstrap=fs.readFileSync('scripts/bootstrap.sql','utf8');db.exec(bootstrap);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,12);
  assert.equal(JSON.parse(db.prepare("SELECT value FROM settings WHERE key='store'").get().value).wa,'573115044650');
  db.exec("UPDATE products SET name='Producto del cliente',stock=17 WHERE id=1; DELETE FROM products WHERE id=2; DELETE FROM slides WHERE id=1; UPDATE settings SET value='[]' WHERE key='side_promos'");
  db.exec(bootstrap);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,11);
  assert.equal(db.prepare('SELECT name,stock FROM products WHERE id=1').get().name,'Producto del cliente');
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=1').get().stock,17);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM slides WHERE id=1').get().n,0);
  assert.equal(db.prepare("SELECT value FROM settings WHERE key='side_promos'").get().value,'[]');
 } finally {db.close();}
});
test('inicializar ajustes faltantes de una base con productos no mezcla el catálogo de ejemplo',()=>{
 const db=new DatabaseSync(':memory:');
 try {
  for(const file of fs.readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort())db.exec(fs.readFileSync('migrations/'+file,'utf8'));
  db.exec("INSERT INTO products(id,name,cat,price,stock) VALUES(50,'Catálogo propio','Sombreros',100000,8)");
  db.exec(fs.readFileSync('scripts/bootstrap.sql','utf8'));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n,1);
  assert.equal(db.prepare('SELECT stock FROM products WHERE id=50').get().stock,8);
  assert.ok(db.prepare("SELECT value FROM settings WHERE key='store'").get());
 } finally {db.close();}
});

function catalogFixture(count=35){const f=storefront();f.context.many=Array.from({length:count},(_,i)=>({id:i+1,name:'Producto '+(i+1),world:'hombre',price:50000,old:0,cat:i%2?'Botas':'Sombreros',categories:[i%2?'Botas':'Sombreros'],desc:'Estilo llanero',stock:3,imgs:[],feats:[]}));f.run('S.products=many;S.categories=[["Sombreros","sombreros"],["Botas","botas"]];renderGrid();');return f;}
const cardCount=f=>(f.nodes['#grid'].innerHTML.match(/<article class="pc"/g)||[]).length;
test('el catálogo renderiza doce tarjetas por página y acota los botones de navegación',()=>{
 const f=catalogFixture();assert.equal(cardCount(f),12);assert.match(f.nodes['#grid'].innerHTML,/data-arg="12"/);assert.doesNotMatch(f.nodes['#grid'].innerHTML,/data-arg="13"/);
 f.run('setCatalogPage(2)');assert.equal(cardCount(f),12);assert.match(f.nodes['#grid'].innerHTML,/data-arg="13"/);assert.doesNotMatch(f.nodes['#grid'].innerHTML,/data-arg="12"/);
 f.run('setCatalogPage(3)');assert.equal(cardCount(f),11);assert.match(f.nodes['#catalog-pagination'].innerHTML,/Mostrando 25–35 de 35/);
 f.run('setCatalogPage(999)');assert.equal(cardCount(f),11);assert.match(f.nodes['#catalog-pagination'].innerHTML,/Página 3 de 3/);
 const large=catalogFixture(1001);large.run('setCatalogPage(40)');assert.equal(cardCount(large),12);assert.ok((large.nodes['#catalog-pagination'].innerHTML.match(/<button/g)||[]).length<=7);
});
test('cambiar filtros o buscar fuera de la página actual vuelve a la primera página',()=>{
 const f=catalogFixture();f.run("setCatalogPage(3);cat='Botas';renderGrid()");assert.equal(cardCount(f),12);assert.match(f.nodes['#catalog-pagination'].innerHTML,/Página 1 de 2/);
 f.run("cat='';q='Producto 35';renderGrid()");assert.equal(cardCount(f),1);assert.match(f.nodes['#grid'].innerHTML,/Producto 35/);assert.equal(f.nodes['#catalog-pagination'].hidden,true);
 f.run("q='sin coincidencias';renderGrid()");assert.equal(cardCount(f),0);assert.equal(f.nodes['#catalog-pagination'].hidden,true);
});
test('al reducir favoritos en la última página se conserva una página válida',()=>{
 const f=catalogFixture();f.run('favs=S.products.map(p=>p.id);favOnly=true;renderGrid();setCatalogPage(3);favs=favs.slice(0,24);renderGrid();');assert.equal(cardCount(f),12);assert.match(f.nodes['#catalog-pagination'].innerHTML,/Página 2 de 2/);
});
