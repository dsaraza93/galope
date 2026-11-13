import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8787';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
try{
 const real=await(await fetch(base+'/api/store')).json();
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const fixture=structuredClone(real);fixture.slides[0]={...fixture.slides[0],customImage:'/img/club-galope.webp',buttonUrl:'#producto-1',mediaFit:'contain'};
  await page.route('**/api/store',r=>r.fulfill({json:fixture}));await page.goto(base);await page.waitForSelector('.pc');
  assert.equal(await page.locator('.galope-hero').count(),0);assert.equal(await page.locator('main > section').first().getAttribute('id'),'ofertas');
  const header=await page.locator('.store-header').boundingBox();
  const box=await page.locator('#bn').boundingBox();assert.ok(Math.abs(box.y-(header.y+header.height))<2,'El banner debe comenzar justo debajo del menú');assert.ok(Math.abs(box.width-width)<1);assert.ok(Math.abs(box.width/box.height-3.2)<.01,JSON.stringify(box));
  assert.equal(await page.locator('.sl.on').evaluate(e=>getComputedStyle(e,'::before').display),'none');assert.equal(await page.locator('#bn .sl-c').count(),0);assert.equal(await page.locator('.banner-count').count(),0);assert.equal(await page.locator('#bn h2').count(),0);
  const media=await page.locator('.sl.on>.banner-media').boundingBox();assert.ok(Math.abs(media.width-box.width)<1&&Math.abs(media.height-box.height)<1);
  await page.locator('.sl.on .artwork-target').click();await page.waitForSelector('#modal.on');assert.equal(new URL(page.url()).hash,'#producto-1');await page.reload();await page.waitForSelector('#modal.on');await page.locator('#modal .x').click();
  await page.locator('#bn').hover();await page.locator('#bn [data-act=next]').click();assert.equal(await page.locator('.sl.on').evaluate(e=>e===document.querySelectorAll('.sl')[1]),true);await page.locator('#bn [data-act=prev]').click();
  await page.locator('.banner-pause').click();assert.equal(await page.locator('.banner-pause').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>{S.slides[0].customImage='/uploads/'+'b'.repeat(32)+'.mp4';renderStore();});assert.equal(await page.locator('.sl.on video').evaluate(v=>v.controls&&v.muted&&v.playsInline),true);assert.equal(await page.locator('.sl.on .artwork-video').isVisible(),true);
  await page.route('**/api/auth/status',r=>r.fulfill({json:{authenticated:true,mode:'google'}}));await page.route('**/api/admin/summary?*',r=>r.fulfill({json:{}}));await page.route('**/api/admin/slides',r=>r.fulfill({json:fixture.slides}));await page.route('**/api/admin/side-promos',r=>r.fulfill({json:fixture.sidePromos}));let saved;await page.route('**/api/admin/slides/1',r=>{saved=r.request().postDataJSON();return r.fulfill({json:{ok:true}});});
  await page.goto(base+'/#admin');await page.locator('[data-act=tab][data-arg=ban]').click();const form=page.locator('form[data-form=slide]').first();assert.equal(await form.locator('[name=tag]').count(),0);assert.equal(await form.locator('[name=off]').count(),0);assert.equal(await form.locator('.banner-editor-copy').isVisible(),false);
  await form.locator('[data-chg=bannerproduct]').selectOption('#producto-2');await form.locator('[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.toast').textContent==='Banner actualizado');assert.equal(new URL(saved.buttonUrl).hash,'#producto-2');assert.equal(saved.mediaFit,'artwork');assert.equal(saved.off,fixture.slides[0].off);assert.equal(saved.timer,false);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({width,photoOnly:'OK',legacyContain:'OK',url:'OK',video:'OK',save:'OK'}));await page.close();
 }
}finally{await browser.close();}
