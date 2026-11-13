import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8791';
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const data=await(await fetch(base+'/api/store')).json();
 const brand=data.slides.find(s=>s.img==='galope-brand');assert.ok(brand,'Aplica 0011 en la base local');
 data.slides=[{...data.slides[0],customImage:'/img/club-galope.webp',mobileImage:'',img:'logo'},brand];
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/store',r=>r.fulfill({json:data}));await page.goto(base);await page.waitForSelector('#bn');
  assert.equal(await page.locator('#bn').count(),1);assert.equal(await page.locator('.galope-hero').count(),0);assert.equal(await page.locator('#bn>.sl').count(),2);
  await page.locator('#bn [data-act=next]').click();
  const picture=page.locator(width<821?'.sl.on .campaign-mobile img':'.sl.on .campaign-desktop img');
  assert.ok(await picture.isVisible());await picture.evaluate(img=>img.decode());assert.match(await picture.getAttribute('src'),/galope-brand-banner/);
  const header=await page.locator('.store-header').boundingBox(),banner=await page.locator('#bn').boundingBox();assert.ok(Math.abs(banner.y-(header.y+header.height))<2);
  await page.screenshot({path:`/tmp/galope-brand-slide-${width}.png`,fullPage:false});
  await page.locator('#bn [data-act=prev]').click();assert.equal(await page.locator('#bn>.sl.on').evaluate(e=>e===e.parentElement.querySelector('.sl')),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log(JSON.stringify({width,singleCarousel:true,brandSlide:true,previousNext:true}));await page.close();
 }
}finally{await browser.close();}
