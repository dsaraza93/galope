import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const benefits=[['shipping','Envíos nacionales','Enviamos tus compras a diferentes destinos del país','truck'],['payments','Medios de pago','Consulta las opciones al finalizar tu compra','credit-card'],['returns','Atención cercana','Estamos aquí para ayudarte','heart-handshake'],['advice','Asesoría personalizada','Te ayudamos a elegir','messages-square'],['stores','Atención en tienda','Conoce nuestra selección llanera','store']].map(([id,title,description,icon])=>({id,title,description,icon,active:true}));
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,motion,count] of [[320,'no-preference',4],[390,'no-preference',4],[390,'reduce',4],[900,'no-preference',4],[1440,'no-preference',4],[1440,'reduce',4],[1440,'no-preference',5],[1440,'reduce',1],[1440,'reduce',0]]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:motion}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const data={settings:{name:'Galope Tienda Llanera',wa:'573115044650',note:'Galope',benefits:benefits.slice(0,count),pay:[],shipping:{}},products:[],categories:[['Sombreros','sombreros']],slides:[],sidePromos:[]};
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.hostname!=='galope-preview.test')return route.abort();
   if(u.pathname==='/api/store')return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/api/'))return route.fulfill({contentType:'application/json',body:'{}'});
   const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
   if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('https://galope-preview.test/');await page.waitForSelector('.trust-horizontal',{state:'attached'});
  if(!count){assert.equal(await page.locator('.trust-horizontal').isVisible(),false);await page.close();console.log('OK beneficios desactivados');continue;}
  await page.locator('.trust-horizontal').scrollIntoViewIfNeeded();
  const metrics=await page.evaluate(()=>{
   const section=document.querySelector('.trust-horizontal'),track=document.querySelector('#trust-track'),card=track.firstElementChild,icon=card.querySelector('.trust-benefit-icon'),controls=document.querySelector('#trust-controls');
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,display:getComputedStyle(track).display,padding:parseFloat(getComputedStyle(card).paddingLeft),iconWidth:icon.getBoundingClientRect().width,controlsVisible:!controls.hidden,controlsDisplay:getComputedStyle(controls).display,maximum:track.scrollWidth-track.clientWidth};
  });
  assert.equal(metrics.display,'flex');assert.ok(metrics.padding>=17);assert.equal(metrics.iconWidth,44);assert.ok(metrics.scrollWidth<=width+1);
  if(width===1440&&count<=4)assert.equal(metrics.controlsVisible,false);
  if(metrics.maximum>1){
   assert.equal(metrics.controlsVisible,true);assert.equal(metrics.controlsDisplay,'flex');
   await page.locator('#trust-controls').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
   const y=await page.evaluate(()=>scrollY);await page.locator('[data-act="trustnext"]').click();await page.waitForFunction(()=>document.querySelector('#trust-track').scrollLeft>1);
   await page.waitForFunction(()=>document.querySelector('#trust-dots button[data-trust-index="1"]')?.getAttribute('aria-pressed')==='true');
   await page.locator('[data-act="trustprev"]').click();await page.waitForFunction(()=>document.querySelector('#trust-track').scrollLeft<1);assert.ok(Math.abs((await page.evaluate(()=>scrollY))-y)<=1);
  }
  if(process.env.BENEFITS_SCREENSHOTS_DIR && motion==='no-preference' && count===4){fs.mkdirSync(process.env.BENEFITS_SCREENSHOTS_DIR,{recursive:true});await page.locator('.trust-horizontal').screenshot({path:path.join(process.env.BENEFITS_SCREENSHOTS_DIR,`benefits-${width}.png`)});}
  if(width===390&&motion==='no-preference'){await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>document.querySelector('#trust-controls').hidden);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...metrics,motion,count,arrowsAndDots:'OK',errors}));await page.close();
 }
}finally{await browser.close();}
