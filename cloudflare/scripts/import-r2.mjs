import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2),remote=args.includes('--remote');const source=args.find(x=>!x.startsWith('--'));
if(!source)throw new Error('Uso: npm run import:r2 -- /ruta/data/uploads [--remote]');
const config=JSON.parse(fs.readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const bucket=config.r2_buckets.find(x=>x.binding==='MEDIA').bucket_name;
const root=fs.realpathSync(source),files=fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
const wrangler=new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url);
const mime={webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'};
for(const file of files){if(!file.isFile()||!/^([a-f0-9]{32})\.(webp|mp4|webm|mov)$/.test(file.name))throw new Error('Archivo inesperado en uploads: '+file.name);}
for(const file of files){
 const filename=path.join(root,file.name),type=mime[file.name.split('.').pop()];
 const result=spawnSync(process.execPath,[fileURLToPath(wrangler),'r2','object','put',bucket+'/'+file.name,'--file',filename,'--content-type',type,remote?'--remote':'--local'],{stdio:'inherit',shell:false});if(result.status!==0)process.exit(result.status||1);
 const checksum=createHash('sha256').update(fs.readFileSync(filename)).digest('hex');console.log(JSON.stringify({file:file.name,sha256:checksum,size:fs.statSync(filename).size}));
}
console.log('Importación R2 terminada: '+files.length+' objetos. Los nombres y URLs originales se conservan.');
