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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={handleBuzzerMessage,submitEveryone,state,premiereSave,restoreSession,isCorrectAnswer,buildBoard,getConfig,difficultyEstimate,learningFor,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}


const host=setup('index.html');advance(1);
const api=host.__engineTest,st=api.state;
const players=Array.from({length:50},(_,i)=>({player:`Player ${i+1}`,deviceToken:`device-${i+1}`,room:'TEST01'}));
const send=(p,type,extra={})=>api.handleBuzzerMessage({...p,type,...extra});
host.document.getElementById('enterPremiereBtn').click();
for(const p of players)send(p,'join');
advance(101);
assert.equal(st.players.length,50);
assert.equal(new Set(st.players.map(p=>p.name)).size,50);
const before=messages.length;
for(const p of players)send(p,'sync-request');
advance(101);
assert.equal(messages.slice(before).filter(m=>m.type==='gameplay-sync').length,1,'one snapshot for a reconnect wave');
for(let i=0;i<50;i++)api.decisionHistory.push({player:players[i].player,id:`decision-${i}`});
const decisionStart=messages.length;api.broadcastGameplaySync();
assert.equal(messages.slice(decisionStart).filter(m=>m.type==='answer-decision').length,0);
assert.equal(Object.keys(messages.filter(m=>m.type==='gameplay-sync').at(-1).decisions).length,50);
host.document.getElementById('competitionRules').value='everyone';
host.document.getElementById('enterWaitingRoomBtn').click();
for(const p of players)send(p,'ready-toggle');
advance(14000);
host.document.querySelector('#boardGrid button:not(:disabled)').click();advance(5001);
assert.equal(st.phase,'ALL_ANSWER');
const answer=api.answers()[0],value=st.board.valueForRow(Number(st.activeKey.split('::')[1]));
for(const p of players)assert.equal(api.submitEveryone(p.player,answer),true);
assert.equal(st.phase,'ALL_REVEAL');assert(st.players.every(p=>p.score===value));
api.premiereSave();const saved=JSON.parse(host.localStorage.getItem('jeopardy-complete-session-v3-TEST01'));
assert.equal(saved.players.length,50);api.restoreSession(saved);assert.equal(st.players.length,50);
const a=setup('buzzer.html');advance(1);a.document.getElementById('nameInput').value='Phone';a.document.getElementById('joinBtn').click();advance(101);
const start=messages.length;advance(4500);
assert.equal(messages.slice(start).filter(m=>m.type==='sync-request').length,0,'healthy phone relies on host snapshots');
assert.deepEqual(errors,[]);host.close();a.close();console.log('PASS 50 player joins, batched resync, compact decision recovery, readiness, simultaneous scoring, saved-session restore and healthy-phone traffic.');
