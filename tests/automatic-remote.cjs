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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={state,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}


const host=setup('index.html');advance(1);const a=setup('buzzer.html'),b=setup('buzzer.html');advance(1);
const el=(w,id)=>w.document.getElementById(id),last=type=>messages.filter(m=>m.type===type).at(-1);
function click(w,id){assert(el(w,id),'Missing '+id);assert(!el(w,id).disabled,'Disabled '+id);el(w,id).click();advance(1);assert.deepEqual(errors,[])}
function fill(w,id,v){el(w,id).value=v}
function send(w,type,extra={}){const state=last('gameplay-sync');const channel=channels[w===a?1:2];channel.send({payload:{type,room:'TEST01',player:w===a?'Alpha':'Beta',gameId:state.gameId,questionId:state.questionId,turnId:state.turnId,expiresAt:host.Date.now()+10000,_mid:'test-'+(++id),...extra}});advance(1)}
const st=host.__engineTest.state;
click(host,'enterPremiereBtn');for(const [w,n]of [[a,'Alpha'],[b,'Beta']]){fill(w,'nameInput',n);click(w,'joinBtn')}
el(host,'dailyDoubles').value='off';el(host,'includeUrbanSlang').checked=true;click(host,'enterWaitingRoomBtn');click(a,'readyBtn');click(b,'readyBtn');advance(14000);
assert(st.board.categories.includes('Urban Slang'));assert(last('board-state').categories.includes('Urban Slang'));
function open(){host.document.querySelector('#boardGrid button:not(:disabled)').click();advance(1);assert.equal(st.phase,'CONTROL_ANSWER')}
fill(host,'qSeconds','99');open();assert.equal(st.timer.remaining,30);assert.equal(el(host,'qSeconds').value,'30');assert.match(el(a,'turnTitle').textContent,/Your turn/);assert.match(el(a,'remoteClock').textContent,/s/);
fill(a,'remoteAnswerInput','saved draft');el(a,'remoteAnswerInput').dispatchEvent(new a.Event('input'));advance(1600);assert.equal(el(a,'remoteAnswerInput').value,'saved draft');
click(host,'pauseQuestionTimerBtn');assert(el(a,'submitAnswerBtn').disabled);assert.match(el(a,'turnTitle').textContent,/paused/);const frozen=el(a,'remoteClock').textContent;advance(2000);assert.equal(el(a,'remoteClock').textContent,frozen);click(host,'pauseQuestionTimerBtn');assert(!el(a,'submitAnswerBtn').disabled);
// Correct answers are automatically judged and scored; no host acceptance.
const accepted=host.__engineTest.answers()[0],initial=st.players[0].score;
fill(a,'remoteAnswerInput','  '+accepted.toUpperCase()+'  ');click(a,'submitAnswerBtn');assert(st.players[0].score>initial);assert.match(el(a,'deliveryStage').textContent,/Correct/);assert.equal(st.activeKey,null);
const answer=messages.filter(m=>m.type==='answer').at(-1),score=st.players[0].score;
channels[1].send({payload:answer});advance(1);assert.equal(st.players[0].score,score);assert.equal(messages.filter(m=>m.type==='action-result'&&m.mid===answer._mid).length,2);
// Human correction is optional, logged, and updates everyone.
fill(host,'overrideReason','Review: incorrect interpretation');click(host,'overrideIncorrect');assert.equal(st.players[0].score,initial);assert(host.__engineTest.decisionHistory.at(-1).overridden);assert.match(el(a,'deliveryStage').textContent,/Host correction/);
fill(host,'qSeconds','12');open();assert.equal(st.timer.remaining,12);assert.match(el(a,'remoteClock').textContent,/12s/);const newKey=st.activeKey;channels[1].send({payload:{...answer,_mid:'late-old-question'}});advance(1);assert.equal(last('action-result').accepted,false);assert.equal(st.activeKey,newKey);
send(b,'answer',{answer:accepted});assert.equal(last('action-result').accepted,false);assert.equal(st.activeKey,newKey);
// Reconnect recovers a draft, then the eligible steal winner gets their own timer.
fill(a,'remoteAnswerInput','reconnection draft');el(a,'remoteAnswerInput').dispatchEvent(new a.Event('input'));channels[1].statusCb('CHANNEL_ERROR');assert(el(a,'submitAnswerBtn').disabled);channels[1].statusCb('SUBSCRIBED');advance(1);assert.equal(el(a,'remoteAnswerInput').value,'reconnection draft');assert(!el(a,'submitAnswerBtn').disabled);
click(a,'passAnswerBtn');advance(4000);click(b,'buzzerBtn');assert.equal(st.phase,'ANSWERING');assert.equal(last('gameplay-sync').firstBuzzer,'Beta');advance(11000);assert.notEqual(st.phase,'ANSWERING');
console.log('PASS automatic judging/scoring; normalized answers; optional logged override; duplicate/stale/out-of-turn rejection; paused countdown; draft and reconnect recovery; steal-answer timeout.');
if(st.activeKey)host.document.querySelector('[data-host-action="board"]').click();advance(1);
let ddChoice;for(const cat of st.board.categories)for(const row of st.board.rows)if(!ddChoice&&!st.used.has(st.board.keyFor(cat,row)))ddChoice={cat,row};
st.board.dailyDoubles.add(st.board.keyFor(ddChoice.cat,ddChoice.row));
host.document.querySelector(`#boardGrid button[aria-label="${ddChoice.cat}, $${st.board.valueForRow(ddChoice.row)}"]`).click();advance(1);
assert.equal(st.phase,'DD_WAGER');const ddPhone=st.controlIdx===0?a:b;assert.equal(el(ddPhone,'dailyDoubleMobile').style.display,'block');fill(ddPhone,'ddMobileWager','0');click(ddPhone,'ddMobileSubmit');assert.equal(st.phase,'CONTROL_ANSWER');assert.equal(st.timer.mode,'main');assert.equal(el(ddPhone,'answerArea').style.display,'block');fill(ddPhone,'remoteAnswerInput',host.__engineTest.answers()[0]);click(ddPhone,'submitAnswerBtn');assert.equal(st.activeKey,null);console.log('PASS Daily Double wager and answer entirely from phone.');

// Enter Final without human adjudication: secret wagers -> private answers -> automatic result.
if(st.activeKey)host.document.querySelector('[data-host-action="board"]').click();advance(1);st.players[0].score=200;st.players[1].score=100;host.__engineTest.startFinalJeopardy();advance(1);
assert.equal(last('final-state').step,'wagers');assert(el(host,'hostDrawerFinalAnswerBtn').disabled);assert.equal(last('final-state').acceptedAnswer,null);assert.equal(last('final-state').clue,'');assert(!el(host,'finalClueText').textContent.includes('2009'));
fill(a,'finalWagerInput','50');click(a,'finalWagerBtn');assert.equal(el(a,'finalWagerBtn').style.display,'none');send(a,'sync-request');assert.equal(el(a,'finalWagerBtn').style.display,'none');
fill(b,'finalWagerInput','25');click(b,'finalWagerBtn');assert.equal(st.final.step,'answers');assert(el(host,'hostDrawerFinalAnswerBtn').disabled);assert.equal(st.final.timerRemaining,120);assert.equal(el(a,'finalAnswerBtn').style.display,'inline-block');
fill(a,'finalAnswerInput',host.__engineTest.finalJeopardy.answers[0]);click(a,'finalAnswerBtn');send(a,'sync-request');assert.equal(el(a,'finalAnswerBtn').style.display,'none');fill(b,'finalAnswerInput','wrong');click(b,'finalAnswerBtn');assert.equal(st.final.step,'reveal');assert(!el(host,'hostDrawerFinalAnswerBtn').disabled);click(host,'hostFinalAnswerRevealBtn');assert.equal(last('final-state').acceptedAnswer,host.__engineTest.finalJeopardy.answers[0]);assert.match(el(a,'finalAnswerRevealed').textContent,/Final Jeopardy Answer:/);advance(5000);assert.equal(el(host,'finalAnswerRevealBanner').parentElement,el(host,'summaryText'));click(host,'hostDrawerFinalAnswerBtn');assert.equal(host.document.querySelectorAll('#finalAnswerRevealBanner').length,1);assert.equal(st.final.step,'complete');assert.equal(el(a,'finalAnswerBtn').style.display,'none');assert.match(el(a,'finalStatusMobile').textContent,/Game complete/);
assert(host.__engineTest.decisionHistory.filter(d=>d.kind==='final').length===2);assert.equal(st.players[0].score,250,JSON.stringify({final:host.__engineTest.finalJeopardy.answers,answers:[...st.final.answers],decisions:host.__engineTest.decisionHistory.filter(d=>d.kind==='final')}));assert.equal(st.players[1].score,75);const betaFinal=host.__engineTest.decisionHistory.find(d=>d.kind==='final'&&d.player==='Beta');fill(host,'overrideDecision',betaFinal.id);fill(host,'overrideReason','Accepted alternate answer after review');click(host,'overrideCorrect');assert.equal(st.players[1].score,125);assert.equal(last('final-results').players.find(p=>p.name==='Beta').score,125);click(host,'overrideCorrect');assert.equal(st.players[1].score,125);console.log('PASS automatic Final transitions, concealed wager clue, 120-second answer clock, reconnect submission locks, automatic results.');
// Reset rotates game identity and old commands cannot affect the new game.
click(host,'resetBtn');assert(el(host,'hostDrawerFinalAnswerBtn').disabled);assert.equal(el(a,'finalAnswerRevealed').style.display,'none');assert.equal(el(a,'finalMobile').style.display,'none');channels[1].send({payload:{...answer,_mid:'previous-game-command'}});advance(1);assert.equal(last('action-result').accepted,false);
host.__engineTest.startFinalJeopardy();advance(31000);assert.equal(st.final.step,'answers');assert.equal(st.final.wagers.get(0),0);assert.equal(st.final.wagers.get(1),0);advance(125000);assert.equal(st.final.step,'complete');assert.deepEqual(errors,[]);
console.log('PASS missing wagers default to zero; missing answers time out; game completes with no human intervention; reset invalidates old commands.');host.close();a.close();b.close();
