import {PhotonImage,resize,SamplingFilter,rotate,fliph,flipv} from '@cf-wasm/photon';
import {HttpError} from './http.js';
import {randomHex} from './crypto.js';
const IMG_RE=/^\/(uploads\/[a-f0-9]{32}|img\/[a-z]{3,20})\.webp$/;
const MEDIA_RE=/^\/uploads\/[a-f0-9]{32}\.(webp|mp4|webm|mov)$/;
export const isOurImage=u=>typeof u==='string'&&IMG_RE.test(u);
export const isOurCampaignMedia=(u,k)=>!u?!k:k==='image'?typeof u==='string'&&MEDIA_RE.test(u)&&u.endsWith('.webp'):k==='video'&&typeof u==='string'&&MEDIA_RE.test(u)&&/\.(mp4|webm|mov)$/.test(u);
export function imageInfo(b){
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength),s=(a,z)=>String.fromCharCode(...b.slice(a,z));
 if(b.length<12)throw new HttpError(400,'Imagen no válida');
 let w=0,h=0,orientation=1;
 if(s(1,4)==='PNG'&&b[0]===137&&b.length>=24){w=d.getUint32(16);h=d.getUint32(20);}
 else if(s(0,4)==='RIFF'&&s(8,12)==='WEBP'){
  if(s(12,16)==='VP8X'&&b.length>=30){w=1+b[24]+(b[25]<<8)+(b[26]<<16);h=1+b[27]+(b[28]<<8)+(b[29]<<16);}
  else if(s(12,16)==='VP8 '&&b.length>=30){w=d.getUint16(26,true)&0x3fff;h=d.getUint16(28,true)&0x3fff;}
  else if(s(12,16)==='VP8L'&&b.length>=25){const bits=d.getUint32(21,true);w=(bits&0x3fff)+1;h=((bits>>>14)&0x3fff)+1;}
 } else if(b[0]===255&&b[1]===216){
  for(let p=2;p+4<b.length;){if(b[p++]!==255)break;const marker=b[p++];if(marker===0xda||marker===0xd9)break;const len=d.getUint16(p);if(len<2||p+len>b.length)break;
   if([0xc0,0xc1,0xc2].includes(marker)&&len>=8){h=d.getUint16(p+3);w=d.getUint16(p+5);}
   if(marker===0xe1&&s(p+2,p+8)==='Exif\0\0'){try{const t=p+8,little=d.getUint16(t)===0x4949;const dir=t+d.getUint32(t+4,little),count=d.getUint16(dir,little);for(let i=0;i<count&&i<100;i++){const e=dir+2+i*12;if(e+12>p+len)break;if(d.getUint16(e,little)===0x112)orientation=d.getUint16(e+8,little);}}catch{}}
   p+=len;
  }
 }
 if(!w||!h||w*h>40e6)throw new HttpError(400,'Imagen no válida o supera 40 megapíxeles');return {w,h,orientation};
}
export function uploads(ctx){
 const {env}=ctx;
 const middleware=limit=>({single:field=>async req=>{
  const form=await req.raw.formData();const file=form.get(field);if(!file||typeof file==='string')throw new HttpError(400,'No llegó ningún archivo');if(file.size>limit)throw new HttpError(413,'Archivo demasiado grande');req.file={buffer:new Uint8Array(await file.arrayBuffer()),originalname:file.name};
 }});
 async function saveImage(bytes,maxBytes=6*1024*1024,maxEdge=1200){
  if(bytes.length>maxBytes)throw new HttpError(413,'La imagen pesa más de 6 MB');
  const {w,h,orientation}=imageInfo(bytes);if(w*h>8e6)throw new HttpError(400,'Usa el panel para reducir esta foto antes de subirla (máximo directo: 8 megapíxeles)');let image,scaled,oriented;
  try{
   image=PhotonImage.new_from_byteslice(bytes);
   if(orientation===2)fliph(image);if(orientation===3)oriented=rotate(image,180);if(orientation===4)flipv(image);
   if(orientation===5){fliph(image);oriented=rotate(image,270);}if(orientation===6)oriented=rotate(image,90);if(orientation===7){fliph(image);oriented=rotate(image,90);}if(orientation===8)oriented=rotate(image,270);
   const source=oriented||image,ratio=Math.min(1,maxEdge/source.get_width(),maxEdge/source.get_height());
   scaled=resize(source,Math.max(1,Math.round(source.get_width()*ratio)),Math.max(1,Math.round(source.get_height()*ratio)),SamplingFilter.Lanczos3);
   const out=scaled.get_bytes_webp(),name=randomHex(16)+'.webp';await env.MEDIA.put(name,out,{httpMetadata:{contentType:'image/webp',cacheControl:'public,max-age=2592000,immutable'}});return '/uploads/'+name;
  }catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'La imagen está dañada o no se pudo procesar');}
  finally{scaled?.free();oriented?.free();image?.free();}
 }
 async function saveCampaignMedia(bytes,name,maxEdge=1200){
  if(bytes.length>20*1024*1024)throw new HttpError(413,'El archivo pesa más de 20 MB');
  if(bytes[0]===137||(bytes[0]===255&&bytes[1]===216)||String.fromCharCode(...bytes.slice(0,4))==='RIFF')return {url:await saveImage(bytes,20*1024*1024,maxEdge),kind:'image'};
  const ext=String(name).split('.').pop().toLowerCase(),mp4=String.fromCharCode(...bytes.slice(4,8))==='ftyp',webm=bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
  if(bytes.length<12||!(['mp4','mov'].includes(ext)&&mp4||ext==='webm'&&webm))throw new HttpError(400,'Video no válido');
  const key=randomHex(16)+'.'+ext;await env.MEDIA.put(key,bytes,{httpMetadata:{contentType:ext==='webm'?'video/webm':ext==='mov'?'video/quicktime':'video/mp4'}});return {url:'/uploads/'+key,kind:'video'};
 }
 // Keep immutable uploads until an explicit offline garbage-collection pass. A request cannot
 // safely delete objects while another administrator may be attaching the same object.
 const cleanupOrphans=async()=>{},cleanupCampaignMedia=async()=>{};
 return {upload:middleware(6*1024*1024),mediaUpload:middleware(20*1024*1024),saveImage,saveCampaignMedia,isOurImage,isOurCampaignMedia,cleanupOrphans,cleanupCampaignMedia};
}
export async function serveMedia(request,env){
 const key=new URL(request.url).pathname.slice('/uploads/'.length);
 if(!/^[a-f0-9]{32}\.(webp|mp4|webm|mov)$/.test(key))throw new HttpError(404,'No encontrado');
 const meta=await env.MEDIA.head(key);if(!meta)throw new HttpError(404,'No encontrado');
 const headers=new Headers();meta.writeHttpMetadata(headers);headers.set('ETag',meta.httpEtag);headers.set('Accept-Ranges','bytes');headers.set('X-Content-Type-Options','nosniff');
 if(request.headers.get('If-None-Match')===meta.httpEtag)return new Response(null,{status:304,headers});
 if(request.method==='HEAD'){headers.set('Content-Length',String(meta.size));return new Response(null,{headers});}
 const range=request.headers.get('range');let options;
 if(range&&(!request.headers.get('if-range')||request.headers.get('if-range')===meta.httpEtag)){
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${meta.size}`}});
  let start=m[1]?Number(m[1]):Math.max(0,meta.size-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),meta.size-1):meta.size-1):meta.size-1;
  if(start>=meta.size||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${meta.size}`}});
  options={range:{offset:start,length:end-start+1}};headers.set('Content-Range',`bytes ${start}-${end}/${meta.size}`);headers.set('Content-Length',String(end-start+1));
 }
 const object=await env.MEDIA.get(key,options);if(!object)throw new HttpError(404,'No encontrado');if(!options)headers.set('Content-Length',String(meta.size));return new Response(object.body,{status:options?206:200,headers});
}
