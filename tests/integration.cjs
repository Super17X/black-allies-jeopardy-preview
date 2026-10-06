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
 w.confirm=()=>true;w.alert=()=>{};w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.QRCode=class{constructor(el){el.innerHTML='<canvas></canvas>'}static CorrectLevel={H:1}};
 w.BroadcastChannel=class{postMessage(){}addEventListener(){}};
 w.supabase={createClient:()=>({channel:name=>{
  const c={name,fn:null,statusCb:null,on(_,__,fn){this.fn=fn;return this},subscribe(fn){this.statusCb=fn;w.setTimeout(()=>fn('SUBSCRIBED'),0);return this},send({payload}){messages.push(payload);channels.filter(x=>x!==c&&x.name===name).forEach(x=>w.setTimeout(()=>x.fn({payload}),0));return Promise.resolve('ok')},unsubscribe(){}};channels.push(c);return c;
 }})};
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(script.textContent);
 return w;
}
const host=setup('index.html');advance(1);
const a=setup('buzzer.html'),b=setup('buzzer.html');advance(1);
function el(w,id){return w.document.getElementById(id)}
function click(w,id){assert(el(w,id),'Missing '+id);assert(!el(w,id).disabled,'Disabled '+id);el(w,id).click();advance(1);assert.deepEqual(errors,[])}
function fill(w,id,value){el(w,id).value=value}
function visible(w,id){return el(w,id).style.display!=='none'}
function last(type){return messages.filter(m=>m.type===type).at(-1)}
click(host,'enterPremiereBtn');
click(host,'lobbyBuzzerLinkBtn');
assert.equal(el(host,'buzzerQr').tagName.toLowerCase(),'svg');

click(host,'closeBuzzerPanelBtn');
assert(!visible(host,'buzzerPanel'));
console.log('PASS SVG QR generation and close button');
for(const [w,name] of [[a,'Alpha'],[b,'Beta']]){fill(w,'nameInput',name);click(w,'joinBtn');assert(visible(w,'buzzerSection'));}
el(host,'dailyDoubles').value='off';
click(host,'enterWaitingRoomBtn');
assert.equal(el(host,'beginGameBtn').disabled,true);
click(a,'readyBtn');click(b,'readyBtn');
assert.equal(el(host,'beginGameBtn').disabled,false);assert.match(el(host,'autoStartIn')?.textContent||host.document.body.textContent,/Auto-start: 10s/);
advance(10000+3000);assert(visible(host,'boardPane'));
console.log('PASS join, phone readiness, all-ready auto-start');
// Find a regular question via observable clue UI; Daily Doubles have a wager input.
let cell=host.document.querySelector('#boardGrid button:not(:disabled)');cell.click();advance(1);
if(visible(host,'ddWagerRow')){fill(host,'ddWagerInput','0');click(host,'ddWagerSubmitBtn');}
assert(visible(a,'answerArea'));assert.equal(el(a,'submitAnswerBtn').disabled,false);
assert.equal(last('question-start').activeKey,last('gameplay-sync').activeKey);
fill(a,'remoteAnswerInput','wrong test answer');
const beforeAnswers=messages.filter(m=>m.type==='answer').length;
el(a,'submitAnswerBtn').click();
el(a,'remoteAnswerInput').dispatchEvent(new a.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
el(a,'submitAnswerBtn').click();advance(1);
assert.equal(messages.filter(m=>m.type==='answer').length,beforeAnswers+1);
assert.deepEqual(errors,[]);
assert(messages.some(m=>m.type==='steal-delay'));
advance(7000);
assert.equal(el(b,'buzzerBtn').disabled,false);
assert(played.some(src=>src.includes('metal_gear_solid.mp3')));
click(b,'buzzerBtn');assert.match(el(host,'buzzTimesHost').textContent,/Beta: \d+ ms/);assert.match(el(a,'buzzTimesMobile').textContent,/Beta: \d+ ms/);assert(last('buzz-times').rows.some(r=>r.name==='Beta'&&r.winner&&Number.isFinite(r.ms)));assert(visible(b,'answerArea'));assert(!visible(a,'answerArea'));
console.log('PASS direct phone answer, question IDs, steal unlock, Metal Gear sound, first buzzer lock');
host.document.querySelector('[data-host-action="board"]').click();advance(1);
click(host,'hostSkipFinalBtn');
assert.equal(last('final-state').step,'wagers');assert.equal(last('final-state').clue,'');
assert(!el(host,'finalClueText').textContent.includes('2009'));
const initialTimer=last('final-state').remaining;advance(1000);assert.equal(last('final-state').remaining,initialTimer);
fill(a,'finalWagerInput','0');click(a,'finalWagerBtn');assert.equal(el(a,'finalWagerBtn').style.display,'none');
// Reconnect snapshot must preserve the locked wager.
channels[1].send({payload:{type:'sync-request',player:'Alpha',room:'TEST01',protocol:2,clientId:messages.find(m=>m.type==='join'&&m.player==='Alpha').clientId}});advance(1);
assert.equal(el(a,'finalWagerBtn').style.display,'none');
// Mix a phone wager and a host wager; host must choose remaining player.
assert.equal(el(host,'finalPlayer').textContent,'Beta');
fill(host,'finalInput','0');click(host,'finalSubmitBtn');
assert.equal(last('final-state').step,'answers');assert.equal(el(a,'finalAnswerBtn').style.display,'inline-block');
assert.match(el(host,'finalTimer').textContent,/120/);
fill(a,'finalAnswerInput','Ursula Burns');click(a,'finalAnswerBtn');
assert.equal(el(host,'finalPlayer').textContent,'Beta');
fill(host,'finalInput','test answer');click(host,'finalSubmitBtn');
assert.equal(last('final-state').step,'reveal');assert.equal(el(a,'finalAnswerBtn').style.display,'none');
click(host,'finalRevealBtn');assert.equal(last('final-state').step,'complete');
assert.equal(el(a,'finalAnswerBtn').style.display,'none');assert.match(el(a,'finalStatusMobile').textContent,/Game complete/);
assert(visible(a,'finalWinnerMobile'));const result=last('final-results');
console.log('PASS hidden Final clue, timer start, mixed local/phone entries, resync locks, final results');
click(host,'resetBtn');assert(!visible(a,'finalMobile'));assert(!visible(b,'finalMobile'));assert(!visible(a,'finalWinnerMobile'));
assert(messages.filter(m=>m.type==='scoreboard-update').at(-1).players.every(p=>p.score===0));
assert(!el(host,'buzzerRaceHost').classList.contains('show'));
assert.equal(last('final-state').step,'off');
assert.equal(last('gameplay-sync').activeKey,null);
console.log('PASS reset clears phone/host results, scores, readiness, question, race');
// Expired commands from a previous game cannot act on the reset game.
const oldAnswer=messages.find(m=>m.type==='answer');
const wrongCount=messages.filter(m=>m.type==='steal-delay').length;
channels[1].send({payload:{...oldAnswer,_mid:'expired-test-command'}});advance(1);
assert.equal(last('action-result').accepted,false);
assert.equal(messages.filter(m=>m.type==='steal-delay').length,wrongCount);
// Duplicate readiness command has one effect and receives the same result.
click(host,'enterWaitingRoomBtn');
const alphaJoin=messages.find(m=>m.type==='join'&&m.player==='Alpha');
const ready={protocol:2,room:'TEST01',type:'ready-set',player:'Alpha',clientId:alphaJoin.clientId,_mid:'ready-repeat-test',ready:true,gameId:last('gameplay-sync').gameId,expiresAt:host.Date.now()+5000};
channels[1].send({payload:ready});channels[1].send({payload:ready});advance(1);
const readyState=last('ready-state');assert.equal(readyState.players.find(p=>p.name==='Alpha').ready,true);
assert.equal(messages.filter(m=>m.type==='action-result'&&m.mid==='ready-repeat-test').length,2);
// A second device cannot claim an active display name.
const c=setup('buzzer.html');advance(1);fill(c,'nameInput','Alpha');click(c,'joinBtn');
assert(!visible(c,'buzzerSection'));assert.match(el(c,'loginError').textContent,/another device/);
// A malformed snapshot and an unknown host must not change the UI or throw.
const remembered=el(a,'questionInfo').textContent;
channels[0].send({payload:{...last('gameplay-sync'),seq:999999,hostId:'unknown-host',active:true,clue:'forged'}});advance(1);
assert.equal(el(a,'questionInfo').textContent,remembered);
channels[0].send({payload:{...last('ready-state'),seq:last('ready-state').seq+1,players:[null]}});advance(1);
assert.deepEqual(errors,[]);
// Channel loss disables all active inputs, then a handshake restores readiness.
channels[1].statusCb('CHANNEL_ERROR');assert(el(a,'submitAnswerBtn').disabled);assert(el(a,'readyBtn').disabled);
channels[1].statusCb('SUBSCRIBED');advance(1);assert(!el(a,'readyBtn').disabled);
// Leaving cancels the pending work and cannot rejoin through a stale timeout.
click(a,'leaveBtn');const joinsBefore=messages.filter(m=>m.type==='join'&&m.player==='Alpha').length;
advance(10000);assert.equal(messages.filter(m=>m.type==='join'&&m.player==='Alpha').length,joinsBefore);
assert(!visible(a,'buzzerSection'));assert.deepEqual(errors,[]);c.close();
console.log('PASS duplicate Enter/taps, expired actions, idempotent ready, name collision, malformed/unknown-host messages, reconnect and leave cleanup');
assert.deepEqual(errors,[]);
host.close();a.close();b.close();
