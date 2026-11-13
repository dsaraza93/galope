import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
try{
 const store=await(await fetch(base+'/api/store')).json();
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForSelector('.pc');const id=await page.locator('.pc .pi').first().getAttribute('data-arg');
  await page.locator('.pc .pi').first().click();await page.waitForSelector('#modal.on');assert.equal(new URL(page.url()).hash,'#producto-'+id);const link=await page.locator('#product-link').inputValue();assert.equal(link,base+'/#producto-'+id);
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);await page.locator('[data-act=copyproduct]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),link);
  await page.goBack();await page.waitForSelector('#modal.on',{state:'hidden'});await page.goForward();await page.waitForSelector('#modal.on');await page.reload();await page.waitForSelector('#modal.on');assert.equal(await page.locator('#product-link').inputValue(),link);await page.locator('#modal .x').click();assert.equal(new URL(page.url()).hash,'');
  const data=structuredClone(store);data.slides[0]={...data.slides[0],mediaFit:'artwork',customImage:'/test-wide.svg',mobileImage:'/test-mobile.svg',buttonUrl:'#producto-'+id};
  await page.route('**/api/store',r=>r.fulfill({json:data}));await page.route('**/test-*.svg',r=>r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${r.request().url().includes('mobile')?800:1920}" height="${r.request().url().includes('mobile')?1000:600}"><rect width="100%" height="100%" fill="#e7ddcf"/></svg>`}));
  await page.goto(base);await page.waitForSelector('.sl.on');assert.equal(await page.locator('.sl.on .sl-c').isVisible(),false);assert.equal(await page.locator('.sl.on .campaign-mobile').isVisible(),width<=820);assert.equal(await page.locator('.sl.on .campaign-desktop').isVisible(),width>820);assert.ok(Math.abs((await page.locator('#bn').boundingBox()).width-width)<1);
  await page.locator('.sl.on .artwork-target').click();await page.waitForSelector('#modal.on');assert.equal(new URL(page.url()).hash,'#producto-'+id);await page.locator('#modal .x').click();
  await page.route('**/api/auth/status',r=>r.fulfill({json:{authenticated:true,mode:'google'}}));await page.route('**/api/admin/summary?*',r=>r.fulfill({json:{}}));await page.route('**/api/admin/slides',r=>r.fulfill({json:store.slides}));await page.route('**/api/admin/side-promos',r=>r.fulfill({json:store.sidePromos}));
  const mobile='/uploads/'+'a'.repeat(32)+'.mp4';await page.route('**/api/admin/banner-media',r=>r.fulfill({json:{url:mobile,kind:'video'}}));let saved;await page.route('**/api/admin/slides/1',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{ok:true}});});
  await page.goto(base+'/#admin');await page.locator('[data-act=tab][data-arg=ban]').click();const form=page.locator('form[data-form=slide]').first();assert.equal(await form.locator('[name=mediaFit]').inputValue(),'artwork');assert.equal(await form.locator('.banner-editor-copy').isVisible(),false);
  await form.locator('[data-banner-target=mobileImage]').setInputFiles({name:'mobile.mp4',mimeType:'video/mp4',buffer:Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0])});await page.waitForFunction(url=>document.querySelector('form[data-form=slide] [name=mobileImage]').value===url,mobile);
  await form.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.toast').textContent==='Banner actualizado');assert.equal(saved.mobileImage,mobile);assert.equal(saved.mediaFit,'artwork');assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,productUrl:link,copy:'OK',history:'OK',artwork:'OK',mobileUpload:'OK'}));await page.close();
 }
}finally{await browser.close();}
