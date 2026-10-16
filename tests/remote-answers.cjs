const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const base=require('node:path').resolve(__dirname,'..')+'/';
const tasks=new Map(),channels=[],messages=[],errors=[],played=[];
let now=0,id=0;
function advance(ms){const target=now+ms;let runs=0;while(true){let pair=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;if(++runs>10000)throw Error('Timer runaway');now=pair[1].at;tasks.delete(pair[0]);if(pair[1].interval)tasks.set(pair[0],{...pair[1],at:now+pair[1].interval});pair[1].fn();}now=target;}
function setup(file){
 const html=fs.readFileSync(base+file,'utf8');
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(e.type==='unhandled-exception')errors.push(e.message)});
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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(script.textContent);
 return w;
}

const host=setup('index.html');advance(1);
const a=setup('buzzer.html'),b=setup('buzzer.html');advance(1);
const el=(w,id)=>w.document.getElementById(id);
function click(w,id){assert(el(w,id),'Missing '+id);assert(!el(w,id).disabled,'Disabled '+id);el(w,id).click();advance(1);assert.deepEqual(errors,[])}
function fill(w,id,value){el(w,id).value=value}
const visible=(w,id)=>el(w,id).style.display==='block';
const last=type=>messages.filter(m=>m.type===type).at(-1);
click(host,'enterPremiereBtn');
for(const [w,name] of [[a,'Alpha'],[b,'Beta']]){fill(w,'nameInput',name);click(w,'joinBtn');}
el(host,'dailyDoubles').value='off';click(host,'enterWaitingRoomBtn');click(a,'readyBtn');click(b,'readyBtn');
advance(14000);
assert.notEqual(el(host,'boardPane').style.display,'none');
host.document.querySelector('#boardGrid button:not(:disabled)').click();advance(1);
if(el(host,'ddWagerRow').style.display!=='none'){fill(host,'ddWagerInput','0');click(host,'ddWagerSubmitBtn');}
assert(visible(a,'answerArea'));assert(!visible(b,'answerArea'));assert(el(a,'buzzerBtn').disabled);
assert.equal(last('question-start').activeKey,last('gameplay-sync').activeKey);
fill(a,'remoteAnswerInput','typed draft');advance(2000);assert.equal(el(a,'remoteAnswerInput').value,'typed draft');
// A reconnect by someone else must not erase the controller's draft.
channels[2].send({payload:{type:'join',player:'Beta',room:'TEST01'}});advance(1);assert.equal(el(a,'remoteAnswerInput').value,'typed draft');
fill(a,'remoteAnswerInput','incorrect test answer');const count=messages.filter(m=>m.type==='answer').length;
el(a,'remoteAnswerInput').dispatchEvent(new a.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));el(a,'submitAnswerBtn').click();advance(1);
assert.equal(messages.filter(m=>m.type==='answer').length,count+1);assert(messages.some(m=>m.type==='answer-received'&&m.player==='Alpha'));
assert.equal(last('gameplay-sync').phase,'STEAL_DELAY');advance(4000);
assert(!el(b,'buzzerBtn').disabled);click(b,'buzzerBtn');
assert.equal(last('gameplay-sync').phase,'ANSWERING');assert.equal(last('gameplay-sync').firstBuzzer,'Beta');assert(visible(b,'answerArea'));assert(!visible(a,'answerArea'));
advance(2000);assert(visible(b,'answerArea'));assert(!el(b,'submitAnswerBtn').disabled);
fill(b,'remoteAnswerInput','another wrong answer');click(b,'submitAnswerBtn');assert(messages.some(m=>m.type==='answer-received'&&m.player==='Beta'));
assert.deepEqual(errors,[]);
console.log('PASS: controller typing and Enter submission; repeat-tap protection; drafts survive sync and rejoin; steal winner retains answer turn and host accepts answer; no script errors.');
host.close();a.close();b.close();
