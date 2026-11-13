import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const base=process.env.CART_TEST_URL||'http://127.0.0.1:8791';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Esta prueba crea pedidos: usa una base local de pruebas.');
const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,fulfillment] of [[320,'pickup'],[390,'pickup'],[1440,'delivery']]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let creates=0,boldCalls=0;page.on('request',r=>{if(r.url().endsWith('/api/orders')&&r.method()==='POST')creates++;if(r.url().includes('/api/bold/start'))boldCalls++;});
  await page.goto(base);await page.waitForSelector('.pc');
  const button=page.locator('.pc [data-act="add"]:enabled').first();const id=Number(await button.getAttribute('data-arg'));
  await button.click();await page.locator('header [data-act="cart"]').click();
  assert.equal(await page.locator('#drawer .line').count(),1);
  await page.locator('#co [name=n]').fill('Cliente prueba carrito');await page.locator('#co [name=t]').fill('3115044650');
  await page.locator(`#drawer [data-act=qty][data-arg="${id}:1"]`).click();assert.equal(await page.locator('#co [name=n]').inputValue(),'Cliente prueba carrito');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart'))[0].q),2);
  await page.locator('#drawer [data-act=cartremove]').click();assert.match(await page.locator('#drawer .empty').textContent(),/vacío/);
  await page.locator('#drawer .x').click();await button.click();await page.reload();await page.waitForSelector('.pc');await page.locator('header [data-act=cart]').click();
  assert.equal(await page.locator('#drawer .line').count(),1);assert.equal(await page.locator('#co [name=documentNumber]').count(),0);
  assert.match(await page.locator('.checkout-pending-note').textContent(),/No se realizará ningún cobro/);
  await page.locator('#co [name=n]').fill('Cliente prueba carrito');await page.locator('#co [name=t]').fill('3115044650');
  await page.locator(`#co [name=fulfillment][value=${fulfillment}]`).check();
  if(fulfillment==='delivery'){
   await page.locator('#co [name=d]').fill('Calle 10 número 20-30');await page.locator('#co [name=city]').fill('Villavicencio');await page.locator('#co [name=region]').fill('Meta');
   await page.locator(`#drawer [data-act=qty][data-arg="${id}:1"]`).click();assert.equal(await page.locator('#co [name=fulfillment]:checked').inputValue(),'delivery');assert.equal(await page.locator('#co [name=d]').inputValue(),'Calle 10 número 20-30');
  }
  const stockBefore=(await(await fetch(base+'/api/store')).json()).products.find(p=>p.id===id).stock;
  const quantity=await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart'))[0].q);
  await page.route('**/api/orders',route=>route.fulfill({status:409,json:{error:'El inventario cambió. Revisa las cantidades.'}}),{times:1});
  await page.locator('#co [type=submit]').click();await page.waitForFunction(()=>document.querySelector('.toast')?.textContent.includes('El inventario cambió'));
  assert.equal(await page.locator('#co [name=n]').inputValue(),'Cliente prueba carrito');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart'))[0].q),quantity);
  await page.locator('#co [type=submit]').click();await page.waitForSelector('.order-confirmation');
  assert.match(await page.locator('.order-confirmation').textContent(),/GAL-.*pendiente de pago/s);assert.match(await page.locator('.order-confirmation').textContent(),/No se ha realizado ningún cobro/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('galope_cart')).length),0);
  const stockAfter=(await(await fetch(base+'/api/store')).json()).products.find(p=>p.id===id).stock;assert.equal(stockBefore-stockAfter,quantity);
  assert.equal(creates,2);assert.equal(boldCalls,0);assert.deepEqual(errors,[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log(JSON.stringify({width,fulfillment,persistence:'OK',quantities:'OK',remove:'OK',order:'OK',stock:'OK',boldCalls}));await page.close();
 }
}finally{await browser.close();}
