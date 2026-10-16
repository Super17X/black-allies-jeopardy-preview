const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
const base=require('node:path').resolve(__dirname,'..')+'/';
const tasks=new Map(),channels=[],messages=[],errors=[],played=[];
let now=0,id=0;
function advance(ms){const target=now+ms;let runs=0;while(true){let pair=[...tasks].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!pair)break;if(++runs>10000)throw Error('Timer runaway');now=pair[1].at;tasks.delete(pair[0]);if(pair[1].interval)tasks.set(pair[0],{...pair[1],at:now+pair[1].interval});pair[1].fn();}now=target;}
function setup(file,storage){
 const html=fs.readFileSync(base+file,'utf8');
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(/unhandled/i.test(e.type||''))errors.push(e.message)});
 const dom=new JSDOM(html,{url:'https://example.test/game/'+file+'?room=TEST01',runScripts:'outside-only',virtualConsole:vc});
 const w=dom.window;if(storage)for(const [k,v] of Object.entries(storage))w.localStorage.setItem(k,v);w.Date.now=()=>1700000000000+now;
 w.JEOPARDY_CONFIG={supabaseUrl:'https://mock.test',supabaseAnonKey:'mock'};
 w.setTimeout=(fn,ms=0)=>{const n=++id;tasks.set(n,{owner:w,fn,at:now+Number(ms)});return n};
 w.setInterval=(fn,ms)=>{const n=++id;tasks.set(n,{owner:w,fn,at:now+Number(ms),interval:Number(ms)});return n};
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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={state,premiereSave,restoreSession,playerSessions,reviewRequests,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}



const h=setup('index.html');advance(400);const a=setup('buzzer.html');advance(1);
const el=(w,id)=>w.document.getElementById(id);el(a,'nameInput').value='Alpha';el(a,'joinBtn').click();advance(1);
const b=setup('buzzer.html');advance(1);el(b,'nameInput').value='Beta';el(b,'joinBtn').click();advance(1);el(h,'dailyDoubles').value='off';el(h,'enterPremiereBtn').click();el(h,'enterWaitingRoomBtn').click();el(a,'readyBtn').click();el(b,'readyBtn').click();advance(14000);
h.document.querySelector('#boardGrid button:not(:disabled)').click();advance(2100);
const t=h.__engineTest;t.premiereSave();const key='jeopardy-complete-session-v3-TEST01';let snap=JSON.parse(h.localStorage.getItem(key));assert(snap.board);const original=JSON.stringify(snap.board);const remaining=snap.timer.remaining;
for(const [k,v] of tasks)if(v.owner===h)tasks.delete(k);channels.splice(0,1);const copy=setup('index.html',{[key]:JSON.stringify(snap)});advance(400);const restored=copy.__engineTest;assert.equal(restored.state.activeKey,snap.activeKey);assert.equal(restored.state.timer.remaining,remaining);restored.premiereSave();assert.equal(JSON.stringify(JSON.parse(copy.localStorage.getItem(key)).board),original);assert.equal(restored.state.players[0].name,'Alpha');assert.equal(restored.playerSessions.get('alpha'),t.playerSessions.get('alpha'));
// Identity isolation and room lock
const intruder=setup('buzzer.html');advance(1);el(intruder,'nameInput').value='Alpha';el(intruder,'joinBtn').click();advance(1);assert.match(el(intruder,'loginError').textContent,/another device/);
el(copy,'roomLock').click();el(intruder,'nameInput').value='Newcomer';el(intruder,'joinBtn').click();advance(1);assert.match(el(intruder,'loginError').textContent,/locked/);
// Final wagers/submissions and remaining answer clock survive reconstruction.
restored.startFinalJeopardy();advance(1);restored.state.final.wagers.set(0,25);restored.beginFinalAnswers();advance(5100);restored.state.final.answers.set(0,'saved submission');restored.premiereSave();snap=JSON.parse(copy.localStorage.getItem(key));restored.restoreSession(snap);assert.equal(restored.state.final.wagers.get(0),25);assert.equal(restored.state.final.answers.get(0),'saved submission');assert.equal(restored.state.final.timerRemaining,snap.final.timerRemaining);assert.equal(restored.state.final.step,'answers');
// Resume a paused question clock without consuming offline time.
const questionSnapshot=JSON.parse(h.localStorage.getItem(key));questionSnapshot.timer.paused=true;restored.restoreSession(questionSnapshot);const pausedRemaining=restored.state.timer.remaining;advance(1100);assert.equal(restored.state.timer.remaining,pausedRemaining);
// Removal revokes the device while retaining the historical score.
el(copy,'removePlayerChoice').value='Alpha';el(copy,'removeRoomPlayer').click();advance(1);assert.equal(restored.playerSessions.has('alpha'),false);assert(restored.state.players.some(p=>p.name==='Alpha'));
assert.deepEqual(errors,[]);console.log('PASS exact concrete board, active clue, remaining timer, device identities, duplicate-name rejection, locked room, Final wagers and submissions recovery.');
