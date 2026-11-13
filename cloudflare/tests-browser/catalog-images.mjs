import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
try{
 const store=await(await fetch(base+'/api/store')).json();
 const fixtures=[{w:1600,h:300},{w:300,h:1600},{w:800,h:800}];
 store.products.forEach((p,i)=>p.imgs=[`/catalog-fixture-${i%3}.svg`,`/catalog-fixture-${(i+1)%3}.svg`]);
 for(const width of [320,390,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/api/store',r=>r.fulfill({json:store}));
  await page.route('**/catalog-fixture-*.svg',r=>{const id=+r.request().url().match(/fixture-(\d)/)[1],{w,h}=fixtures[id];return r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#e6ddd0"/><circle cx="${w/2}" cy="${h/2}" r="100" fill="#684574"/></svg>`});});
  await page.goto(base);await page.waitForSelector('.pc');await page.locator('#grid').scrollIntoViewIfNeeded();
  await page.locator('#grid').evaluate(e=>Promise.all([...e.querySelectorAll('img')].map(i=>i.decode())));
  const sizes=await page.locator('.pc .pi').evaluateAll(nodes=>nodes.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,photos:[...e.querySelectorAll('img')].map(i=>({w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height,fit:getComputedStyle(i).objectFit,padding:getComputedStyle(i).padding,top:i.getBoundingClientRect().top-e.getBoundingClientRect().top}))})));
  for(const s of sizes){assert.ok(Math.abs(s.w/s.h-.8)<.005,JSON.stringify(s));assert.ok(Math.abs(s.h-sizes[0].h)<1,JSON.stringify(sizes));for(const p of s.photos){assert.equal(p.fit,'cover');assert.equal(p.padding,'0px');assert.ok(Math.abs(p.w-s.w)<1&&Math.abs(p.h-s.h)<1&&Math.abs(p.top)<1,JSON.stringify({s,p}));}}
  await page.locator('.pc .pi').first().hover();const after=await page.locator('.pc .pi').first().boundingBox();assert.ok(Math.abs(after.height-sizes[0].h)<1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.pc [data-act="view"]').first().click();await page.waitForSelector('#modal.on');assert.equal(await page.locator('.gm img').evaluate(i=>getComputedStyle(i).objectFit),'contain');
  console.log(JSON.stringify({width,frame:sizes[0],uniform:'OK',alternate:'OK',detail:'OK'}));await page.close();
 }
}finally{await browser.close();}
