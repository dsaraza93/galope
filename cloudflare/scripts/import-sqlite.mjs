import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function exportSql(input){
 const db=new DatabaseSync(input,{readOnly:true});
 try{
  const expected=new Map();
  // Derive allowed tables/columns from the exact migrations shipped with this release.
  const target=new DatabaseSync(':memory:');
  for(const name of fs.readdirSync(new URL('../migrations/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())target.exec(fs.readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
  for(const {name}of target.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())expected.set(name,target.prepare('PRAGMA table_info("'+name+'")').all().map(x=>x.name));
  target.close();
  const tables=['settings','products','slides','subscribers','orders','order_items','broadcast_members','broadcast_batches','campaigns','bold_checkout_orders','bold_webhook_events','bold_inventory_events'];
  const actual=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
  const output=['-- PRIVATE MIGRATION DATA. Never commit or include this file in the release ZIP.','-- Apply migrations to an EMPTY D1 database first. Back up the source and target.'];
  const quote=v=>v===null?'NULL':typeof v==='bigint'||typeof v==='number'?String(v):"'"+String(v).replace(/'/g,"''")+"'";
  for(const name of tables){if(!actual.has(name))continue;const existing=db.prepare('PRAGMA table_info("'+name+'")').all().map(x=>x.name),columns=existing.filter(x=>expected.get(name).includes(x));
   for(const row of db.prepare('SELECT * FROM "'+name+'" ORDER BY rowid').all()){
    // A legacy pending Bold checkout never deducted physical stock. New D1 triggers
    // acquire its hold. Expired legacy rows are recovered by the final VERIFYING update.
    if(name==='bold_checkout_orders'&&row.status==='PENDING'&&!existing.includes('stock_held')&&Date.parse(row.expires_at.replace(' ','T')+'Z')<=Date.now())row.status='EXPIRED';
    // Sessions are intentionally excluded; administrators sign in again after migration.
    output.push('INSERT INTO "'+name+'" ('+columns.map(x=>'"'+x+'"').join(',')+') VALUES ('+columns.map(x=>quote(row[x])).join(',')+');');
   }
  }
  // Old approved Bold transactions already deducted stock, but did not create normal orders.
  // Backfill their history without touching inventory a second time.
  output.push(`INSERT INTO orders(id,created_at,name,tel,addr,pay_id,pay_name,subtotal,free_shipping,total,status,reservation_state)
SELECT b.id,b.created_at,b.name,b.tel,b.address,'bold','Bold',b.subtotal,CASE WHEN b.shipping=0 THEN 1 ELSE 0 END,b.total,'Nuevo','committed' FROM bold_checkout_orders b WHERE b.status='PAID' AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.id=b.id);`);
  output.push(`INSERT INTO order_items(order_id,product_id,name,price,qty) SELECT b.id,json_extract(j.value,'$.id'),json_extract(j.value,'$.name'),json_extract(j.value,'$.price'),json_extract(j.value,'$.q') FROM bold_checkout_orders b,json_each(b.items_json) j WHERE b.status='PAID' AND NOT EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=b.id);`);
  output.push("UPDATE products SET categories=json_array(cat) WHERE categories='[]';");
  // Establish the required UI settings for databases from versions predating side promotions.
  output.push(`INSERT OR IGNORE INTO settings(key,value) VALUES('side_promos','[{"eyebrow":"Envío gratis","title":"Consulta las condiciones de envío","cta":"Comprar ahora","category":"","theme":"morado","active":true},{"eyebrow":"Nuevos ingresos","title":"Lo último para su llegada","cta":"Descubrir","category":"","theme":"crema","active":true}]');`);
  output.push("UPDATE bold_checkout_orders SET status='VERIFYING' WHERE status IN('EXPIRED','REJECTED') AND stock_held=0 AND rejection_confirmed=0;");
  output.push("UPDATE bold_checkout_orders SET status='VERIFYING',reservation_alert='AWAITING_PAYMENT_VERIFICATION' WHERE status='PENDING' AND expires_at<=datetime('now');");
  output.push("UPDATE bold_checkout_orders SET payment_status='' WHERE status='VERIFYING' AND payment_status='RESERVATION_EXPIRED';");
  output.push("INSERT INTO migration_meta(key,value) VALUES('source_imported_at',datetime('now')); ");
  return output.join('\n')+'\n';
 }finally{db.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw new Error('Uso: npm run import:sqlite -- /ruta/galope.db /ruta/privada/import.sql');
 if(fs.existsSync(output))throw new Error('El archivo de salida ya existe; no se sobrescribirá');
 fs.writeFileSync(output,exportSql(input),{mode:0o600,flag:'wx'});console.log('Exportación creada. Contiene datos privados; aplícala solo a un D1 vacío y elimínala cuando verifiques la migración.');
}
