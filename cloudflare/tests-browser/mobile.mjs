import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8787';
const executablePath=process.env.CHROME_BIN||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const screenshots=process.env.MOBILE_SCREENSHOTS_DIR;
if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [320,390,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:844},isMobile:width<821,hasTouch:width<821,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  await page.goto(base);await page.waitForSelector('.pc');
  const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,header:document.querySelector('header').getBoundingClientRect().height,card:document.querySelector('.pc').getBoundingClientRect().width,hero:document.querySelector('.bn').getBoundingClientRect().height,overflows:[...document.querySelectorAll('.pc,.pc .act,.pc .pr,#chips')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className)}));
  assert.ok(metrics.documentWidth<=width,JSON.stringify(metrics));assert.deepEqual(metrics.overflows,[],JSON.stringify(metrics));
  if(width<=820){
   assert.ok(metrics.header<=130,JSON.stringify(metrics));
   const menu=page.locator('.mobile-menu-toggle');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');
   await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert.equal(await menu.evaluate(e=>e===document.activeElement),true);await menu.click();
   await page.locator('#store-nav summary').first().click();await page.locator('#store-nav [data-act="world"]').first().click();assert.equal(await menu.getAttribute('aria-expanded'),'false');
   await page.locator('.mobile-nav [data-act="focussearch"]').click();const name=await page.locator('.pc h3').first().textContent();await page.locator('#q').fill(name);assert.ok(await page.locator('.pc').count()>=1);await page.locator('#q').fill('');
   await page.locator('.pc .act [data-act="view"]').first().click();await page.waitForSelector('#modal.on');assert.equal(await page.locator('#app').evaluate(e=>e.inert),true);
   await page.locator('#modal [data-act="addview"]').click();await page.waitForSelector('#modal.on',{state:'hidden'});
   await page.locator('.mobile-nav [data-act="cart"]').click();await page.waitForSelector('#drawer.on');
   const overflow=await page.locator('#drawer').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(overflow.scroll<=overflow.width,JSON.stringify(overflow));
   await page.locator('#co [name="n"]').fill('Cliente de prueba');await page.locator('#drawer .qty button').last().click();assert.equal(await page.locator('#co [name="n"]').inputValue(),'Cliente de prueba');assert.equal(await page.locator('#co [value="addi"]').isDisabled(),true);assert.equal(await page.locator('#co [value="sistecredito"]').isDisabled(),true);await page.locator('#drawer .x').click();assert.equal(await page.locator('#app').evaluate(e=>e.inert),false);
   if(screenshots&&width===390){
    await page.locator('.mobile-nav [data-act="home"]').click();await page.screenshot({path:path.join(screenshots,'mobile-home.png')});
    await page.locator('.mobile-nav [data-act="browse"]').click();await page.screenshot({path:path.join(screenshots,'mobile-catalog.png')});
    await page.locator('.pc .act [data-act="view"]').first().click();await page.screenshot({path:path.join(screenshots,'mobile-product.png')});
   }
  }else if(screenshots&&width===1440)await page.screenshot({path:path.join(screenshots,'desktop-home.png')});
  assert.deepEqual(errors,[],errors.join('\n'));console.log(JSON.stringify({viewport:width,...metrics,flows:'OK'}));await page.close();
 }
}finally{await browser.close();}
