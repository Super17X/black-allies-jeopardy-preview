const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{webcrypto}=require('node:crypto');
const root=require('node:path').resolve(__dirname,'..');
function prepare(html,url){const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;Object.defineProperty(w,'crypto',{value:webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.confirm=()=>true;w.eval(fs.readFileSync(root+'/host-wire.js','utf8'));return dom;}
(async()=>{
const board=prepare('<div id="hostDrawer"><button id="increment">Add point</button><button id="disabled" disabled>Unavailable</button><input id="scoreInput" aria-label="Score adjustment" value="5"><input id="fixed" readonly value="120"></div><div id="lobbyPane" style="display:none"></div><div id="qaPane"><button id="pass">Pass</button></div>','https://test.example/game/?room=TEST01');const w=board.window;w.qrcode=()=>({addData(){},make(){},createSvgTag(){return '<svg></svg>'}});w.eval(fs.readFileSync(root+'/host-bridge.js','utf8'));
let count=0,version='turn1',imported=null,delivery=null;const packets=[];w.document.getElementById('increment').onclick=()=>count++;
const bridge=w.JeopardyRemoteHost.init({room:'TEST01',context:()=>version,phase:()=> 'Player answering',notes:()=> 'Board is authoritative',send:p=>{packets.push(p);if(delivery)delivery(p)},exportRecovery:()=>'{"version":3}',importRecovery:x=>imported=x,monitor:()=>{}});
await w.document.getElementById('pairMobileHost').onclick();const link=w.document.getElementById('mobileHostLink').href,secret=new URLSearchParams(new URL(link).hash.slice(1)).get('key');assert.equal(secret.length,43);assert(!bridge.snapshot().controls.some(c=>c.id==='revokeMobileHost'));assert(!JSON.stringify(bridge.snapshot()).includes(secret));
const wire=await w.JeopardyHostWire.open('TEST01',secret);const large='x'.repeat(300000);assert.equal((await wire.decode('board',await wire.encode('board',{large}))).large.length,large.length);let seq=0;
const request=extra=>({id:'req'+(++seq),expiresAt:Date.now()+10000,context:version,...extra});
async function send(req,custom=wire){await bridge.handle(await custom.encode('phone',req));const out=packets.at(-1);return out?wire.decode('board',out):null;}
const req=request({action:'click',control:'increment',confirmed:true});await send(req);assert.equal(count,1);await send(req);assert.equal(count,1,'same id must never apply twice');assert(w.sessionStorage.getItem('jeopardy-mobile-host-replays-TEST01').includes(req.id));
let result=await send(request({action:'click',control:'disabled',confirmed:true}));assert.equal(result.ok,false);
result=await send(request({action:'click',control:'not-allowlisted',confirmed:true}));assert.equal(result.ok,false);
result=await send(request({action:'change',control:'fixed',value:'1'}));assert.equal(result.ok,false);assert.equal(w.document.getElementById('fixed').value,'120');
const stale=request({action:'click',control:'increment',confirmed:true});version='turn2';await send(stale);assert.equal(count,1);
const wrong=await w.JeopardyHostWire.open('TEST01',w.JeopardyHostWire.randomKey());const before=packets.length;await bridge.handle(await wrong.encode('phone',request({action:'click',control:'increment'})));assert.equal(packets.length,before);assert.equal(count,1);
const reflection=await wire.encode('board',request({action:'click',control:'increment'}));await bridge.handle(reflection);assert.equal(count,1);
result=await send(request({action:'export'}));assert.equal(result.recovery,'{"version":3}');assert(!JSON.stringify(packets.at(-1)).includes('"version":3'));
result=await send(request({action:'import',text:'{"restored":true}',confirmed:true}));assert.equal(result.ok,true);assert(imported.restored);
// Real host-mobile controller communicates through the encrypted board bridge.
const phone=prepare(fs.readFileSync(root+'/host.html','utf8'),'https://test.example/game/host.html?room=TEST01#key='+secret),p=phone.window;let receive;
p.JEOPARDY_CONFIG={supabaseUrl:'https://mock.test',supabaseAnonKey:'public'};p.supabase={createClient:()=>({channel:()=>({on(_,__,fn){receive=fn;return this},subscribe(fn){fn('SUBSCRIBED');return this},send({payload}){return bridge.handle(payload)},unsubscribe(){}})})};delivery=payload=>receive?.({payload});p.eval(fs.readFileSync(root+'/host-mobile.js','utf8'));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out waiting for host UI');}
await until(()=>p.document.querySelector('[data-control="increment"]'));assert.equal(p.location.hash,'');assert.match(p.document.getElementById('hostConnection').textContent,/Connected securely/);p.document.querySelector('[data-control="increment"]').click();await until(()=>count===2);await until(()=>p.document.getElementById('hostFeedback').textContent.includes('Applied'));
w.document.getElementById('revokeMobileHost').click();await bridge.handle(await wire.encode('phone',request({action:'click',control:'increment'})));assert.equal(count,2);assert.equal(w.sessionStorage.getItem('jeopardy-mobile-host-key-TEST01'),null);
phone.window.close();board.window.close();console.log('PASS encrypted host pairing and mobile UI, fragment removal, no player credential exposure, authenticated actions, replay protection, stale/disabled/unknown/readonly rejection, encrypted recovery, and revocation.');
})().catch(e=>{console.error(e);process.exit(1)});
