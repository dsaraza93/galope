export const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
export const randomHex=n=>hex(crypto.getRandomValues(new Uint8Array(n)));
export async function sha(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function hmac(key,body){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(body)));}
export function constantEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
export function base64(bytes){let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);}
