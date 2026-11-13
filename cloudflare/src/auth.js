import {createRemoteJWKSet,jwtVerify} from 'jose';
import {HttpError} from './http.js';
import {sha,randomHex} from './crypto.js';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export function auth(ctx){
 const {db,cfg}=ctx;
 function cookie(req){try {return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('galope_sid='))?.slice('galope_sid='.length)||'';}catch{return '';}}
 async function session(req){if(!cfg.googleClientId||!cfg.adminEmails.length)return null;const tok=cookie(req);if(!/^[a-f0-9]{64}$/.test(tok))return null;const s=await db.prepare('SELECT * FROM sessions WHERE token_hash=? AND expires_at>?').get(await sha(tok),Date.now());return s&&cfg.adminEmails.includes(s.email)?s:null;}
 return {
 async requireAdmin(req){const s=await session(req);if(!s)throw new HttpError(401,'Inicia sesión como administrador');req.admin={email:s.email,name:s.name};},
 async status(req){const s=await session(req);return {mode:'google',authenticated:!!s,email:s?.email||null,name:s?.name||null,googleClientId:cfg.googleClientId};},
 async login(credential,req,res){
  if(!cfg.googleClientId||!cfg.adminEmails.length)throw new HttpError(503,'Configura GOOGLE_CLIENT_ID y ADMIN_EMAILS');
  if(typeof credential!=='string'||credential.length<100||credential.length>4096)throw new HttpError(400,'Credencial inválida');
  let p;try{({payload:p}=await jwtVerify(credential,keys,{issuer:['accounts.google.com','https://accounts.google.com'],audience:cfg.googleClientId,algorithms:['RS256'],maxTokenAge:'1h'}));}catch{throw new HttpError(401,'No se pudo verificar la cuenta de Google');}
  const email=String(p.email||'').toLowerCase();
  if(p.email_verified!==true||!cfg.adminEmails.includes(email)||!p.sub||(p.azp&&p.azp!==cfg.googleClientId))throw new HttpError(403,'Esta cuenta no tiene permiso de administrador');
  const token=randomHex(32);await db.prepare('INSERT INTO sessions(token_hash,email,name,expires_at) VALUES(?,?,?,?)').run(await sha(token),email,String(p.name||'').slice(0,100),Date.now()+cfg.sessionTtlMs);
  res.set('Set-Cookie',`galope_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(cfg.sessionTtlMs/1000)}${req.secure?'; Secure':''}`);
  return {ok:true,email};
 },
 async logout(req,res){const tok=cookie(req);if(tok)await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(await sha(tok));res.set('Set-Cookie',`galope_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${req.secure?'; Secure':''}`);}
 };
}
