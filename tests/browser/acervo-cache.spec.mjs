import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(fileURLToPath(new URL('../../site/',import.meta.url)));
const records=JSON.parse(await readFile(resolve(root,'data/acervo.json'),'utf8'));
const recovered=JSON.stringify(records.map(record=>({...record,tem_imagem:false})));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'};

async function serve(page,onData,run) {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const server=createServer(async(request,response)=>{
    try {
      const path=new URL(request.url,'http://127.0.0.1').pathname;
      if(path==='/data/acervo.json') return onData(response);
      const file=resolve(root,'.'+decodeURIComponent(path));
      if(!file.startsWith(root+sep)){response.writeHead(404);response.end();return;}
      const body=await readFile(file);
      if(!response.destroyed){response.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});response.end(body);}
    }catch(error){if(!response.destroyed){response.writeHead(error.code==='ENOENT'?404:500);response.end();}}
  });
  await new Promise((resolveListening,rejectListening)=>{server.once('error',rejectListening);server.listen(0,'127.0.0.1',resolveListening);});
  try {await run('http://127.0.0.1:'+server.address().port);expect(errors).toEqual([]);}
  finally {await page.close();await new Promise(resolveClosed=>{server.close(resolveClosed);server.closeAllConnections();});}
}

test('manual retry bypasses a fresh invalid JSON entry in the real browser cache',async({page})=>{
  // Routing disables HTTP cache; this test intentionally installs no routes.
  let fixed=false,requests=0;const invalid='{"broken":';
  await serve(page,response=>{
    requests++;
    response.writeHead(200,{'Content-Type':'application/json','Cache-Control':'max-age=3600'});
    response.end(fixed?recovered:invalid);
  },async origin=>{
    await page.goto(origin+'/acervo.html');
    await expect(page.locator('#ex-title')).toHaveText('Acervo indisponível');expect(requests).toBe(1);
    fixed=true;
    expect(await page.evaluate(async()=>(await fetch('data/acervo.json')).text())).toBe(invalid);
    expect(requests).toBe(1);
    await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();
    await expect(page.locator('#result-count')).toContainText(`${records.length} de ${records.length}`);
    expect(requests).toBe(2);await expect(page.locator('#q')).toBeFocused();
  });
});

test('automatic retry bypasses a cached transient 503 response',async({page})=>{
  let requests=0;
  await serve(page,response=>{
    requests++;
    response.writeHead(requests===1?503:200,{'Content-Type':'application/json','Cache-Control':'max-age=3600'});
    response.end(requests===1?'temporarily unavailable':recovered);
  },async origin=>{
    await page.goto(origin+'/acervo.html');
    await expect(page.locator('#result-count')).toContainText(`${records.length} de ${records.length}`);
    expect(requests).toBe(2);
  });
});

test('deadline also aborts a JSON body that stalls after successful headers',async({page})=>{
  let requests=0;
  const start=new Date('2026-10-03T00:00:00Z');
  await page.clock.install({time:start});
  await page.clock.pauseAt(new Date(start.getTime()+1000));
  await serve(page,response=>{
    requests++;
    response.writeHead(200,{'Content-Type':'application/json'});
    if(requests===1){response.flushHeaders();response.write('[');}else response.end(recovered);
  },async origin=>{
    await page.goto(origin+'/acervo.html',{waitUntil:'domcontentloaded'});
    await expect.poll(()=>requests).toBe(1);
    await page.clock.fastForward(7999);
    await expect(page.locator('#result-count')).toContainText('Carregando');expect(requests).toBe(1);
    for(let i=0;i<5&&requests<2;i++){await page.clock.fastForward(1000);await page.waitForTimeout(20);}
    await expect(page.locator('#result-count')).toContainText(`${records.length} de ${records.length}`);
    expect(requests).toBe(2);
  });
});
