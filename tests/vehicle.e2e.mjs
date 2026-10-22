import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { parseYtd } from "../src/formats/ytd.js";
const [yft, ytd] = process.argv.slice(2);
if (!yft || !ytd) throw Error("Uso: node tests/vehicle.e2e.mjs modelo.yft texturas.ytd");
const source = parseYtd(await fs.readFile(ytd));
const output = await fs.mkdtemp(path.join(os.tmpdir(), "godoy-vehicle-"));
const port = 4198;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {stdio:["ignore","pipe","pipe"]});
let logs="", browser;
server.stdout.on("data",d=>logs+=d);server.stderr.on("data",d=>logs+=d);
try {
  let ready=false;
  for(let i=0;i<60;i++) {
    if(server.exitCode!==null) throw Error(logs);
    try {if((await fetch(`http://127.0.0.1:${port}`)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ready, logs || "Preview não iniciou");
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",headless:true,args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader"]});
  const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
  await page.goto(`http://127.0.0.1:${port}`);
  await page.locator("#model-file").setInputFiles(path.resolve(yft));
  await page.waitForFunction(()=>document.querySelector("#asset-type").textContent.includes("YFT NATIVO"));
  await page.locator("#ytd-file").setInputFiles(path.resolve(ytd));
  await page.waitForFunction(()=>document.querySelector("#texture-select").options.length>0);
  assert.equal(await page.locator("#texture-select option").count(),source.textures.length);
  const selected = await page.locator("#texture-name").textContent();
  const initial=await page.locator("#map").evaluate(c=>c.toDataURL());
  await page.waitForTimeout(500);
  const box=await page.locator("#scene").boundingBox();
  let painted=false;
  for(const [x,y] of [[.5,.5],[.45,.5],[.55,.5],[.5,.55],[.4,.5],[.6,.5],[.45,.55],[.55,.55],[.5,.45]]) {
    await page.mouse.click(box.x+box.width*x,box.y+box.height*y);
    if(await page.locator("#map").evaluate(c=>c.toDataURL())!==initial){painted=true;break;}
  }
  assert.ok(painted,"Não foi possível pintar a carroceria no 3D");
  console.log("Pintura 3D OK");
  const exportedPromise=page.waitForEvent("download",{timeout:120000});
  await page.click("#export-native");
  const exported=await exportedPromise;
  const exportPath=path.join(output,"editado.ytd");await exported.saveAs(exportPath);
  console.log("Download YTD OK");
  const reopened=parseYtd(await fs.readFile(exportPath));
  assert.equal(reopened.textures.length,source.textures.length);
  let changed=0;
  for(let i=0;i<source.textures.length;i++) {
    const a=source.textures[i],b=reopened.textures[i];
    assert.equal(a.name,b.name);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
    const same=Buffer.from(a.decode()).equals(Buffer.from(b.decode()));
    if(a.name===selected){assert.ok(!same,"Pintura não foi exportada");changed++;}else assert.ok(same,`Textura não editada mudou: ${a.name}`);
  }
  assert.equal(changed,1);
  console.log("Releitura YTD e texturas preservadas OK");
  const paintedMap = await page.locator("#map").evaluate(c=>c.toDataURL());
  const savePromise=page.waitForEvent("download",{timeout:30000});await page.click("#save-project");
  const saved=await savePromise;const projectPath=path.join(output,"viatura.paintfive");await saved.saveAs(projectPath);
  const project=JSON.parse(await fs.readFile(projectPath,"utf8"));assert.equal(project.modelFormat,"yft");
  console.log("Projeto YFT salvo OK");
  await page.locator("#model-file").setInputFiles(projectPath);
  await page.waitForFunction(()=>document.querySelector("#toast").textContent==="Projeto restaurado.");
  assert.equal(await page.locator("#map").evaluate(c=>c.toDataURL()),paintedMap);
  assert.equal(await page.locator("#texture-name").textContent(),selected);
  const variant=source.textures.find(t=>t.name!==selected && t.name.replace(/_\d+$/,"")===selected.replace(/_\d+$/,""));
  if(variant) {
    await page.selectOption("#texture-select",variant.key);
    assert.equal(await page.locator("#texture-name").textContent(),variant.name);
    await page.selectOption("#texture-select",source.textures.find(t=>t.name===selected).key);
  }
  await page.screenshot({path:path.join(output,"viatura.png")});
  assert.deepEqual(errors,[]);
  console.log(`PASS: YFT/YTD reais, ${source.textures.length} texturas, pintura 3D, YTD reaberto com só a textura editada alterada, projeto YFT restaurado${variant?", troca de variação":""}.`);
  console.log("Artifacts:",output);
} finally {await browser?.close();server.kill();}
