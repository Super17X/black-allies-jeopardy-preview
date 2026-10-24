const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const base=require('node:path').resolve(__dirname,'..')+'/';
const tasks=new Map(),channels=[],messages=[],errors=[],played=[];
let now=0,id=0;
function advance(ms){const target=now+ms;let runs=0;while(true){let pair=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;if(++runs>10000)throw Error('Timer runaway');now=pair[1].at;tasks.delete(pair[0]);if(pair[1].interval)tasks.set(pair[0],{...pair[1],at:now+pair[1].interval});pair[1].fn();}now=target;}
function setup(file){
 const html=fs.readFileSync(base+file,'utf8');
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(/unhandled/i.test(e.type||''))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'https://example.test/game/'+file+'?room=TEST01',runScripts:'outside-only',virtualConsole:vc});
 const w=dom.window;w.Date.now=()=>1700000000000+now;
 w.JEOPARDY_CONFIG={supabaseUrl:'https://mock.test',supabaseAnonKey:'mock'};
 w.setTimeout=(fn,ms=0)=>{const n=++id;tasks.set(n,{fn,at:now+Number(ms)});return n};
 w.setInterval=(fn,ms)=>{const n=++id;tasks.set(n,{fn,at:now+Number(ms),interval:Number(ms)});return n};
 w.clearTimeout=w.clearInterval=n=>tasks.delete(n);
 w.requestAnimationFrame=fn=>w.setTimeout(fn,0);w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.HTMLElement.prototype.getBoundingClientRect=()=>({top:0,left:0,right:900,bottom:600,width:900,height:600});
 w.HTMLMediaElement.prototype.play=function(){played.push(this.src);return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};
 w.Audio=class{constructor(src){this.src=src;this.currentTime=0;this.volume=1;}play(){played.push(this.src);return Promise.resolve()}pause(){} addEventListener(){}};
 w.AudioContext=class{constructor(){this.currentTime=0;this.destination={}}createOscillator(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){},stop(){}}}createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}};
 w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.QRCode=class{constructor(el){el.innerHTML='<canvas></canvas>'}static CorrectLevel={H:1}};
 w.qrcode=()=>({addData(){},make(){},createSvgTag(){return '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="20" height="20" fill="black"/></svg>'}});

 w.BroadcastChannel=class{postMessage(){}addEventListener(){}};
 w.supabase={createClient:()=>({channel:name=>{
  const c={name,fn:null,statusCb:null,on(_,__,fn){this.fn=fn;return this},subscribe(fn){this.statusCb=fn;w.setTimeout(()=>fn('SUBSCRIBED'),0);return this},send({payload}){messages.push(payload);channels.filter(x=>x!==c&&x.name===name).forEach(x=>w.setTimeout(()=>x.fn({payload}),0));return Promise.resolve('ok')},unsubscribe(){}};channels.push(c);return c;
 }})};
 Object.defineProperty(w,'crypto',{value:require('node:crypto').webcrypto});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 for(const asset of ['assets/qrcode.js','host-wire.js','host-bridge.js'])w.eval(fs.readFileSync(base+asset,'utf8'));
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={state,getMobileBridge:()=>mobileHostBridge,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}


(async()=>{const host=setup('index.html');advance(1);host.document.getElementById('enterPremiereBtn').click();advance(1);assert(host.document.getElementById('pairMobileHost'));await host.document.getElementById('pairMobileHost').onclick();const url=new URL(host.document.getElementById('mobileHostLink').href),secret=new URLSearchParams(url.hash.slice(1)).get('key');assert.equal(url.pathname,'/game/host.html');assert.equal(secret.length,43);assert(host.document.querySelector('#mobileHostQr svg path'));assert(!host.document.getElementById('premiumLobbyLink').href.includes(secret));
const wire=await host.JeopardyHostWire.open('TEST01',secret),bridge=host.__engineTest.getMobileBridge();let n=0;
async function request(extra){await bridge.handle(await wire.encode('phone',{id:'integration'+(++n),expiresAt:host.Date.now()+10000,context:bridge.snapshot().context,...extra}));advance(1);const packet=messages.filter(m=>m.type==='host-secure').at(-1);return wire.decode('board',packet);}
let r=await request({action:'sync'});assert(r.snapshot.controls.some(c=>c.id==='competitionRules'));assert(r.snapshot.controls.some(c=>c.id==='roomLock'));assert(r.snapshot.controls.some(c=>c.id==='importRecovery'));assert(!r.snapshot.controls.some(c=>c.id==='fullscreenBtn'));await request({action:'change',control:'nameInput',value:'Remote host added'});r=await request({action:'click',control:'addPlayerBtn',confirmed:true});assert(r.ok);assert.equal(host.__engineTest.state.players[0].name,'Remote host added');assert.deepEqual(errors,[]);host.close();console.log('PASS real game host bridge integration, actual QR matrix, private/player link separation, settings and room/recovery controls, remote action updates the authoritative game state.');})().catch(e=>{console.error(e);process.exit(1)});
