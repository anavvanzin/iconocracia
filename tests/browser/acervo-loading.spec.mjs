import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const items = JSON.parse(readFileSync(new URL('../../site/data/acervo.json', import.meta.url)));
test.beforeEach(async ({page}) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
});
const ready = page => expect(page.locator('#result-count')).toContainText(`${items.length} de ${items.length}`);
test('repeated first loads and reloads use the real Worker and retain selection',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>{
    if(request.url().startsWith('http://127.0.0.1:') && request.failure()?.errorText!=='net::ERR_ABORTED') errors.push(request.url()+': '+request.failure()?.errorText);
  });
  for(let i=0;i<10;i++) {
    await page.goto('/acervo?item=BR-009');
    await ready(page);
    await expect(page.locator('#ex-title')).toHaveText('A Justiça');
    await expect.poll(()=>page.locator('#ex-image img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
    await page.evaluate(()=>document.fonts.ready);
    await page.reload();
    await ready(page);
    await expect(page.locator('#ex-title')).toHaveText('A Justiça');
  }
  expect(errors).toEqual([]);
});
test('a connection reset is retried without losing the requested filter and item',async({page})=>{
  let requests=0;
  await page.route('**/data/acervo.json',async r=>{
    if(++requests===1) await r.abort('connectionreset');else await r.continue();
  });
  await page.goto('/acervo?pais=Brasil&item=BR-009&visao=grade');
  await expect(page.locator('#result-count')).toContainText('registros');
  await expect(page.locator('#f-pais')).toHaveValue('Brasil');
  await expect(page.locator('#view-grade')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.ex-frame[aria-pressed="true"]')).toHaveAttribute('data-id','BR-009');
  expect(requests).toBe(2);
});
test('a temporary 503 recovers automatically',async({page})=>{
  let requests=0;
  await page.route('**/data/acervo.json',async r=>{
    if(++requests===1) await r.fulfill({status:503,body:'temporarily unavailable'});else await r.continue();
  });
  await page.goto('/acervo');await ready(page);expect(requests).toBe(2);
});
test('bounded retries end in a recoverable error and keep the original URL',async({page})=>{
  let broken=true,requests=0;
  await page.route('**/data/acervo.json',async r=>{
    requests++;if(broken) await r.fulfill({status:503,body:'unavailable'});else await r.continue();
  });
  await page.goto('/acervo?pais=Brasil&item=BR-009&visao=grade');
  await expect(page.locator('#result-count')).toContainText('Falha');
  expect(requests).toBe(3);
  await expect(page).toHaveURL(/pais=Brasil&item=BR-009&visao=grade/);
  const retry=page.getByRole('button',{name:'Tentar novamente',exact:true});
  await expect(retry).toBeVisible();
  broken=false;await retry.click();
  await expect(page.locator('#result-count')).toContainText('registros');
  await expect(page.locator('#q')).toBeFocused();
  await expect(page.locator('#f-pais')).toHaveValue('Brasil');
  await expect(page.locator('.ex-frame[aria-pressed="true"]')).toHaveAttribute('data-id','BR-009');
  const values=await page.locator('#f-pais option').evaluateAll(options=>options.map(o=>o.value));
  expect(new Set(values).size).toBe(values.length);
});
test('a permanent 404 does not loop and can be retried manually',async({page})=>{
  let broken=true,requests=0;
  await page.route('**/data/acervo.json',async r=>{
    requests++;if(broken)await r.fulfill({status:404,body:'not found'});else await r.continue();
  });
  await page.goto('/acervo');
  await expect(page.locator('#result-count')).toContainText('Falha');
  expect(requests).toBe(1);
  await expect(page.locator('.exhibition')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#q')).toBeDisabled();
  broken=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await ready(page);
  await expect(page.locator('#q')).toBeEnabled();
});
test('a detached image failure cannot replace the newly selected work',async({page})=>{
  await page.goto('/acervo');await ready(page);
  const old=await page.locator('#ex-image img').elementHandle();
  await page.locator('.ex-next').click();
  const title=await page.locator('#ex-title').textContent();
  await old.evaluate(image=>image.dispatchEvent(new Event('error')));
  await expect(page.locator('#ex-title')).toHaveText(title);
  await expect(page.locator('#ex-image img')).toHaveAttribute('alt',title);
});
test('invalid payload is an error with manual recovery, never an empty search',async({page})=>{
  let broken=true,requests=0;
  await page.route('**/data/acervo.json',async r=>{
    requests++;if(broken)await r.fulfill({contentType:'application/json',body:'[{"id":"broken"}]'});else await r.continue();
  });
  await page.goto('/acervo');
  await expect(page.locator('#ex-title')).toHaveText('Acervo indisponível');
  expect(requests).toBe(1);
  broken=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await ready(page);
});
test('slow request cannot stay loading forever and a later attempt succeeds',async({page})=>{
  let requests=0;
  await page.route('**/data/acervo.json',async r=>{
    if(++requests===1){await new Promise(resolve=>setTimeout(resolve,9000));await r.abort().catch(()=>{});}else await r.continue();
  });
  await page.goto('/acervo');
  await expect(page.locator('#result-count')).toContainText(`${items.length} de ${items.length}`,{timeout:15000});
  expect(requests).toBe(2);
});
test('search, four filters, views, empty state and complete record remain usable',async({page})=>{
  await page.goto('/acervo');await ready(page);
  for(const key of ['pais','regime','periodo','tipo']) {
    const field=page.locator('#f-'+key);const value=await field.locator('option').nth(1).getAttribute('value');
    await field.selectOption(value);await page.reload();await expect(field).toHaveValue(value);
    await expect(page.locator('#result-count')).toContainText('registros');await page.locator('#clear-filters').click();
  }
  await page.locator('#q').fill('A Justiça');
  for(const view of ['grade','constelacao','palco']) {await page.locator('#view-'+view).click();await expect(page.locator('#view-'+view)).toHaveAttribute('aria-pressed','true');}
  await page.locator('#ex-open').click();await expect(page.locator('dialog')).toContainText('Citação');await page.keyboard.press('Escape');
  await page.locator('#q').fill('no-record-match-unique');await expect(page.locator('#ex-title')).toHaveText('Nenhuma obra encontrada');
  await page.locator('#clear-filters').click();await ready(page);
});
for(const [name,record] of [
  ['numeric ID',{...items[0],id:42}],
  ['empty ID',{...items[0],id:''}],
  ['blank ID',{...items[0],id:' '}],
  ['invalid country',{...items[0],pais:42}],
]) test(`invalid ${name} is recoverable without accepting incompatible records`,async({page})=>{
  let fixed=false,requests=0;
  await page.route('**/data/acervo.json',async route=>{
    requests++;if(fixed)await route.continue();else await route.fulfill({contentType:'application/json',body:JSON.stringify([record])});
  });
  await page.goto('/acervo?item=BR-009&pais=Brasil');
  await expect(page.locator('#ex-title')).toHaveText('Acervo indisponível');expect(requests).toBe(1);
  await expect(page).toHaveURL(/item=BR-009&pais=Brasil/);
  fixed=true;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await expect(page.locator('#ex-title')).toHaveText('A Justiça');await expect(page.locator('#f-pais')).toHaveValue('Brasil');
});
test('unknown country and item URL values recover to a valid collection state',async({page})=>{
  await page.goto('/acervo/?pais=not-a-country&item=not-an-id&visao=grade');
  await ready(page);await expect(page.locator('#f-pais')).toHaveValue('');
  await expect(page.locator('.ex-frame[aria-pressed="true"]')).toHaveCount(1);
  expect(new URL(page.url()).searchParams.get('item')).toBe('BR-009');
  expect(new URL(page.url()).searchParams.has('pais')).toBe(false);
});
test('canonical images need no preview map and constellation dialog returns keyboard focus',async({page})=>{
  let mapRequests=0;
  page.on('request',request=>{if(request.url().includes('acervo-map.json'))mapRequests++;});
  await page.route('**/assets/acervo-map.json',()=>{});
  await page.goto('/acervo?item=BR-009&q=BR-009&visao=constelacao');
  const star=page.locator('.ex-star');await expect(star).toHaveCount(1);
  const original=await star.elementHandle();await star.focus();await page.keyboard.press('Enter');
  await expect(page.locator('dialog')).toContainText('A Justiça');await page.keyboard.press('Escape');
  await expect(star).toBeFocused();expect(await original.evaluate(el=>el.isConnected)).toBe(true);
  expect(mapRequests).toBe(0);
  await expect(page.locator('#ex-image img')).toHaveAttribute('src','assets/acervo/BR-009.webp');
});
