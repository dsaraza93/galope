import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.MOBILE_TEST_URL||'http://127.0.0.1:8787';
const executablePath=process.env.CHROME_BIN||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width<821,hasTouch:width<821,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.abort());
  const orderId='BC-'+'D'.repeat(20),orderToken='e'.repeat(48);let approved=false,rejected=false,purchased,checks=0,starts=0;
  await page.addInitScript(()=>{window.BoldCheckout=class {open(){window.checkoutOpened=true;}};});
  await page.route('**/api/bold/start',async route=>{starts++;purchased=route.request().postDataJSON().items;await route.fulfill({json:{orderId,orderToken,currency:'COP',amount:'119900',apiKey:'fixture',integritySignature:'fixture',mode:'sandbox'}});});
  await page.route('**/api/bold/status',async route=>{checks++;await route.fulfill({json:{orderId,status:approved?'PAID':rejected?'REJECTED':'PENDING',...(approved?{items:purchased}:{}),...(rejected?{rejectionConfirmed:true,stockReleased:true}:{})}});});
  await page.goto(base);await page.waitForSelector('.pc');
  await page.locator('.pc [data-act="add"]').first().click();
  await page.locator('header [data-act="cart"]').click();
  await page.locator('#co [name="n"]').fill('Cliente de prueba');await page.locator('#co [name="t"]').fill('573001234567');await page.locator('#co [name="documentNumber"]').fill('12345678');await page.locator('#co [name="d"]').fill('Calle de prueba 123');
  await page.locator('#co button[type="submit"],#co .checkout-summary>.pill').click();
  await page.waitForFunction(()=>window.checkoutOpened===true);await page.waitForFunction(()=>!!localStorage.getItem('galope_pending_bold'));
  await page.evaluate(()=>checkBoldReturn({quiet:true}));assert.ok(checks>=1);assert.equal(starts,1);
  assert.equal(await page.locator('#drawer .line').count(),1);assert.ok(await page.locator('#drawer .payment-verification').isVisible());
  approved=true;await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));return checkBoldReturn({quiet:true});});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('galope_cart')).length===0);
  assert.match(await page.locator('#drawer .list').textContent(),/vacío/);assert.equal(await page.locator('#drawer #co').count(),0);assert.equal(await page.locator('header .cn').isHidden(),true);assert.equal(await page.evaluate(()=>sessionStorage.getItem('galope_pending_bold')),null);
  // Legacy pending state must also recover on reload without ?bold-return=1,
  // even if the reserved product currently has zero free stock.
  await page.evaluate(({orderId,orderToken,purchased})=>{localStorage.setItem('galope_cart',JSON.stringify(purchased));localStorage.removeItem('galope_paid_orders');sessionStorage.setItem('galope_pending_bold',JSON.stringify({orderId,orderToken}));}, {orderId,orderToken,purchased});
  approved=false;
  await page.route('**/api/store',async route=>{const response=await route.fetch();const store=await response.json();for(const p of store.products)if(purchased.some(i=>i.id===p.id))p.stock=0;await route.fulfill({json:store});});
  await page.reload();await page.waitForSelector('.pc');await page.evaluate(()=>checkBoldReturn({quiet:true}));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart')).length),1);
  approved=true;await page.evaluate(()=>checkBoldReturn({quiet:true}));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart')).length),0);
  await page.unroute('**/api/store');approved=false;rejected=true;
  await page.evaluate(({orderId,orderToken,purchased})=>{localStorage.setItem('galope_cart',JSON.stringify(purchased));sessionStorage.setItem('galope_pending_bold',JSON.stringify({orderId,orderToken}));},{orderId,orderToken,purchased});
  await page.reload();await page.waitForSelector('.pc');await page.evaluate(()=>checkBoldReturn({quiet:true}));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart')).length),1);assert.equal(await page.evaluate(()=>readPendingBold()),null);
  await page.locator('header [data-act="cart"]').click();assert.equal(await page.locator('#drawer .line').count(),1);assert.equal(await page.locator('#co .checkout-summary>.pill').isEnabled(),true);await page.locator('#drawer .x').click();
  await page.route('**/api/auth/status',r=>r.fulfill({json:{mode:'google',authenticated:true,email:'admin@example.test'}}));
  await page.route('**/api/admin/bold-payments',r=>r.fulfill({json:[{id:orderId,status:'REJECTED',rejectionConfirmed:true,stockHeld:false,name:'Fixture',tel:'',createdAt:'fixture',documentNumber:'',address:'Fixture address',fulfillment:'delivery',total:119900,items:[{name:'Fixture product',q:1,price:119900}],paymentStatus:'REJECTED',paymentId:'verified-reject'}]}));
  await page.evaluate(()=>{tab='pag';location.hash='#admin';});await page.waitForSelector('.payment-verification.released');
  assert.match(await page.locator('.payment-verification.released').textContent(),/Reserva liberada/);assert.ok(!(await page.locator('.payment-verification.released').textContent()).includes('Inventario reservado para este pedido'));
  assert.deepEqual(errors,[],errors.join('\n'));console.log(JSON.stringify({viewport:width,embeddedApproval:'OK',legacyReload:'OK',confirmedRejection:'OK',adminReleasedLabel:'OK',realPayments:false}));await page.close();
 }
}finally{await browser.close();}
