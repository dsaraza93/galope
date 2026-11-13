import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {exportSql} from '../scripts/import-sqlite.mjs';
const schema=()=>fs.readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort().map(x=>fs.readFileSync('migrations/'+x,'utf8')).join('\n');
const insertBold=(db,id,status,extra='')=>db.prepare(`INSERT INTO bold_checkout_orders(id,access_token_hash,expires_at,status,name,tel,document_type,document_number,address,fulfillment,items_json,subtotal,shipping,total${extra?',stock_held':''}) VALUES(?,?,'2099-01-01',?,'Cliente','573001234567','CC','12345678','Calle 123','delivery','[{"id":1,"q":1,"price":64900,"name":"Sombrero"}]',64900,0,64900${extra?',1':''})`).run(id,'hash',status);
test('importa SQLite legacy, conserva clientes/campañas/fotos y vincula ventas sin descontar dos veces',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bc-import-'));const file=path.join(dir,'legacy.db');let source,target;
 try{
  source=new DatabaseSync(file);source.exec(fs.readFileSync('migrations/0001_legacy.sql','utf8'));source.exec(fs.readFileSync('tests/fixture.sql','utf8'));
  source.exec("INSERT INTO subscribers(tel,name,consent,status,interest) VALUES('573009999999','Cliente',1,'active','ambos'); INSERT INTO campaigns(name,message,media_url,media_kind) VALUES('Campaña','Mensaje','/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp','image'); INSERT INTO sessions(token_hash,email,expires_at) VALUES('private-session','admin@example.test',9999999999999)");
  insertBold(source,'BC-11111111111111111111','PAID');source.exec('UPDATE products SET stock=29 WHERE id=1');insertBold(source,'BC-22222222222222222222','PENDING');
  const sql=exportSql(file);assert.ok(!sql.includes('private-session'));
  target=new DatabaseSync(':memory:');target.exec(schema());target.exec(sql);
  assert.equal(target.prepare('SELECT stock FROM products WHERE id=1').get().stock,28);
  assert.equal(target.prepare('SELECT COUNT(*) n FROM orders').get().n,1);assert.equal(target.prepare('SELECT COUNT(*) n FROM order_items').get().n,1);
  assert.equal(target.prepare('SELECT COUNT(*) n FROM subscribers').get().n,1);assert.equal(target.prepare('SELECT media_url FROM campaigns').get().media_url,'/uploads/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp');
  assert.throws(()=>target.exec(sql));
 }finally{source?.close();target?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('una exportación del esquema nuevo conserva reservas sin doble descuento',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bc-v2-import-'));const file=path.join(dir,'source.db');let source,target;
 try{source=new DatabaseSync(file);source.exec(schema());source.exec(fs.readFileSync('tests/fixture.sql','utf8'));insertBold(source,'BC-33333333333333333333','PENDING');assert.equal(source.prepare('SELECT stock FROM products WHERE id=1').get().stock,29);
 const sql=exportSql(file);target=new DatabaseSync(':memory:');target.exec(schema());target.exec(sql);assert.equal(target.prepare('SELECT stock FROM products WHERE id=1').get().stock,29);assert.equal(target.prepare('SELECT stock_held FROM bold_checkout_orders').get().stock_held,1);
 }finally{source?.close();target?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('el catálogo de demostración no reescribe valores existentes',()=>{const db=new DatabaseSync(':memory:');try{db.exec(schema());const seed=fs.readFileSync('scripts/demo.sql','utf8');db.exec(seed);db.exec("UPDATE products SET name='No sobrescribir',stock=9 WHERE id=1");db.exec(seed);assert.equal(db.prepare('SELECT name FROM products WHERE id=1').get().name,'No sobrescribir');assert.equal(db.prepare('SELECT stock FROM products WHERE id=1').get().stock,9);}finally{db.close();}});
test('la migración protege reservas liberadas por la política anterior sin inventar stock',()=>{
 for(const available of [30,0]){
  const db=new DatabaseSync(':memory:');try{
   db.exec(fs.readFileSync('migrations/0001_legacy.sql','utf8'));db.exec(fs.readFileSync('migrations/0002_workers.sql','utf8'));db.exec(fs.readFileSync('tests/fixture.sql','utf8'));
   insertBold(db,'BC-44444444444444444444','PENDING');db.exec("UPDATE bold_checkout_orders SET status='EXPIRED',payment_status='RESERVATION_EXPIRED'; UPDATE products SET stock="+available+' WHERE id=1');
   db.exec(fs.readFileSync('migrations/0003_protect_unverified_stock.sql','utf8'));
   const row=db.prepare('SELECT status,stock_held,reservation_alert FROM bold_checkout_orders').get();assert.equal(db.prepare('SELECT payment_status FROM bold_checkout_orders').get().payment_status,'');assert.equal(row.status,'VERIFYING');assert.equal(row.stock_held,available?1:0);assert.equal(row.reservation_alert,available?'LEGACY_HOLD_RESTORED':'STOCK_REVIEW_REQUIRED');assert.equal(db.prepare('SELECT stock FROM products WHERE id=1').get().stock,available?29:0);
  }finally{db.close();}
 }
});
test('importar un rechazo conciliado no vuelve a reservar ni duplica su devolución',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bc-rejection-import-'));const file=path.join(dir,'source.db');let source,target;
 try{source=new DatabaseSync(file);source.exec(schema());source.exec(fs.readFileSync('tests/fixture.sql','utf8'));insertBold(source,'BC-55555555555555555555','PENDING');source.exec("UPDATE bold_checkout_orders SET status='REJECTED',confirmed_rejection_payment_id='verified-reject',rejection_confirmed=1");assert.equal(source.prepare('SELECT stock FROM products WHERE id=1').get().stock,30);const sql=exportSql(file);target=new DatabaseSync(':memory:');target.exec(schema());target.exec(sql);assert.equal(target.prepare('SELECT stock FROM products WHERE id=1').get().stock,30);assert.equal(target.prepare('SELECT status FROM bold_checkout_orders').get().status,'REJECTED');assert.equal(target.prepare('SELECT COUNT(*) n FROM bold_inventory_events').get().n,1);
 }finally{source?.close();target?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
