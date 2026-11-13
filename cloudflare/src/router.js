import {HttpError} from './http.js';
export class Router {
 constructor(){this.routes=[];}
 add(method,path,handlers){
  const names=[]; const pattern=path.split(/(:[A-Za-z]+)/).map(part=>part.startsWith(':')?(names.push(part.slice(1)),'([^/]+?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
  this.routes.push({method,regex:new RegExp('^'+pattern+'$'),names,handlers}); return this;
 }
 get(p,...h){return this.add('GET',p,h)} post(p,...h){return this.add('POST',p,h)} put(p,...h){return this.add('PUT',p,h)} patch(p,...h){return this.add('PATCH',p,h)} delete(p,...h){return this.add('DELETE',p,h)}
 async handle(req){
  for(const r of this.routes){const m=req.path.match(r.regex);if(r.method!==req.method||!m)continue;
   req.params=Object.fromEntries(r.names.map((n,i)=>[n,decodeURIComponent(m[i+1])]));
   const res=new Reply();
   for(const h of r.handlers){await h(req,res);if(res.response)return res.response;}
   if(res.response)return res.response;
   throw new Error('Handler did not respond');
  }
  throw new HttpError(404,'No encontrado');
 }
}
export class Reply {
 constructor(){this.code=200;this.headers=new Headers({'Cache-Control':'no-store'});}
 status(n){this.code=n;return this;}
 set(k,v){if(typeof k==='object')for(const [n,value]of Object.entries(k))this.headers.set(n,value);else this.headers.set(k,v);return this;}
 type(v){return this.set('Content-Type',v)}
 json(v){this.type('application/json; charset=utf-8');this.response=new Response(JSON.stringify(v),{status:this.code,headers:this.headers});return this;}
 send(v){this.response=new Response(v,{status:this.code,headers:this.headers});return this;}
}
