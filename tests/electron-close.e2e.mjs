import {_electron as electron} from 'playwright';
import assert from 'node:assert/strict';
import {makeYdd} from './fixtures.js';
const executablePath=process.env.ELECTRON_PATH;
if(!executablePath) throw Error('Defina ELECTRON_PATH com o executável Electron Linux para este teste.');
async function launch(){
 return electron.launch({executablePath,args:['--no-sandbox','--ozone-platform=headless','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','electron.cjs'],timeout:30000});
}
let app;
try{
 app=await launch();
 const page=await app.firstWindow();await page.waitForSelector('#scene');
 await page.locator('#model-file').setInputFiles({name:'unsaved.ydd',mimeType:'application/octet-stream',buffer:Buffer.from(makeYdd())});
 await page.waitForFunction(()=>document.querySelector('#asset-type').textContent.includes('YDD NATIVO'));
 // Keep native BrowserWindow/renderer close handling real; substitute only the
 // modal button selection, since a headless machine cannot click an OS dialog.
 await app.evaluate(({dialog,BrowserWindow})=>{
  globalThis.closePrompts=[];globalThis.closeChoice=0;
  dialog.showMessageBoxSync=(_window,options)=>{globalThis.closePrompts.push(options);return globalThis.closeChoice;};
  BrowserWindow.getAllWindows()[0].close();
 });
 for(let i=0;i<50;i++){
  if(await app.evaluate(()=>globalThis.closePrompts.length))break;
  await new Promise(r=>setTimeout(r,100));
 }
 const state=await app.evaluate(({BrowserWindow})=>({windows:BrowserWindow.getAllWindows().length,prompts:globalThis.closePrompts}));
 assert.equal(state.prompts.length,1,'Fechar com alterações não abriu confirmação');
 assert.equal(state.windows,1,'Continuar editando fechou a janela');
 assert.deepEqual(state.prompts[0].buttons,['Continuar editando','Sair sem salvar']);
 assert.equal(state.prompts[0].cancelId,0);
 const closed=app.waitForEvent('close');
 await app.evaluate(({BrowserWindow})=>{globalThis.closeChoice=1;BrowserWindow.getAllWindows()[0].close();});
 await closed;app=null;
 // An unchanged project must close directly without asking or blocking.
 app=await launch();const clean=await app.firstWindow();await clean.waitForSelector('#scene');
 await app.evaluate(({dialog})=>{dialog.showMessageBoxSync=()=>{throw Error('Projeto sem alterações não precisa de confirmação');};});
 const cleanClosed=app.waitForEvent('close');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await cleanClosed;app=null;
 console.log('PASS: Electron real fecha sem alterações; com alterações permite continuar ou sair sem salvar.');
}finally{if(app){await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}}
