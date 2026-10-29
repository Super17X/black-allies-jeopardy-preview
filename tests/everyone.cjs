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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={state,premiereSave,restoreSession,isCorrectAnswer,buildBoard,getConfig,difficultyEstimate,learningFor,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}


const host=setup('index.html');host.document.getElementById('competitionRules').value='controller';host.document.getElementById('finalWagerPolicy').value='full';advance(1);const a=setup('buzzer.html'),b=setup('buzzer.html');advance(1);
const el=(w,id)=>w.document.getElementById(id),last=type=>messages.filter(m=>m.type===type).at(-1);
function click(w,id){assert(el(w,id),'Missing '+id);assert(!el(w,id).disabled,'Disabled '+id);el(w,id).click();advance(1);assert.deepEqual(errors,[])}
function fill(w,id,v){el(w,id).value=v}
function send(w,type,extra={}){const state=last('gameplay-sync');const channel=channels[w===a?1:2];channel.send({payload:{type,room:'TEST01',player:w===a?'Alpha':'Beta',gameId:state.gameId,questionId:state.questionId,turnId:state.turnId,expiresAt:host.Date.now()+10000,_mid:'test-'+(++id),...extra}});advance(1)}
const st=host.__engineTest.state;
click(host,'enterPremiereBtn');el(host,'competitionRules').value='everyone';el(host,'conversationMode').checked=true;el(host,'conversationMode').dispatchEvent(new host.Event('change'));const quietPlayed=played.length;
for(const [w,n]of [[a,'Alpha'],[b,'Beta']]){fill(w,'nameInput',n);click(w,'joinBtn')}
el(host,'dailyDoubles').value='on';click(host,'enterWaitingRoomBtn');click(a,'readyBtn');click(b,'readyBtn');advance(14000);
assert.equal(st.board.dailyDoubles.size,0);assert(host.document.body.classList.contains('conversation-mode'));
function open(){host.document.querySelector('#boardGrid button:not(:disabled)').click();advance(1);assert.equal(st.phase,'READING');advance(5000);assert.equal(st.phase,'ALL_ANSWER');assert.match(el(a,'playerNowGuide').textContent,/private answer/);assert(!el(a,'submitAnswerBtn').disabled);assert(!el(b,'submitAnswerBtn').disabled);assert(el(a,'buzzerBtn').disabled);}
assert(host.__engineTest.isCorrectAnswer('BrownV.BoardOfEducation',['brown v board of education']));assert(host.__engineTest.isCorrectAnswer('Beyoncé!',['beyonce']));assert(!host.__engineTest.isCorrectAnswer('14th amendment',['13th amendment']));
open();const ans=host.__engineTest.answers()[0],value=st.board.valueForRow(Number(st.activeKey.split('::')[1]));fill(a,'remoteAnswerInput',ans);click(a,'submitAnswerBtn');assert.equal(st.players[0].score,0);assert.equal(st.phase,'ALL_ANSWER');assert.match(el(a,'deliveryStage').textContent,/Locked|locked/);
host.__engineTest.premiereSave();const saved=JSON.parse(host.localStorage.getItem('jeopardy-complete-session-v3-TEST01'));assert.equal(saved.allRound.submissions.length,1);host.__engineTest.restoreSession(saved);advance(1);assert.equal(st.phase,'ALL_ANSWER');assert.equal(el(a,'answerArea').style.display,'none');
fill(b,'remoteAnswerInput',ans);click(b,'submitAnswerBtn');assert.equal(st.phase,'ALL_REVEAL');assert.match(el(a,'playerNowGuide').textContent,/explanation/);assert.equal(st.players[0].score,value);assert.equal(st.players[1].score,value);assert(el(a,'phoneLearning').textContent.includes('Discuss:'));assert(!el(host,'continueEveryone').hidden);advance(10000);assert.equal(st.phase,'ALL_REVEAL');click(host,'continueEveryone');assert.equal(st.controlIdx,1);
open();click(a,'passAnswerBtn');advance(31000);assert.equal(st.phase,'ALL_REVEAL');assert.match(el(a,'playerNowGuide').textContent,/explanation/);assert.equal(st.players[0].score,value);assert.equal(st.players[1].score,value);click(b,'resyncPhone');advance(101);assert.match(el(b,'deliveryStage').textContent,/No points|No answer|0/);click(host,'continueEveryone');
const evidence=JSON.parse(host.localStorage.getItem('jeopardy-clue-evidence-v1'));assert(Object.values(evidence).some(x=>x.everyone?.attempts===2));assert.equal(played.length,quietPlayed);
const item=['Synthetic calibration check',['test']],pool=[item];host.localStorage.setItem('jeopardy-clue-evidence-v1',JSON.stringify({'Test::Synthetic calibration check':{everyone:{attempts:20,correct:20,sessions:['one']}}}));assert.match(host.__engineTest.difficultyEstimate('Test',item,pool).status,/Editorial/);
host.localStorage.setItem('jeopardy-clue-evidence-v1',JSON.stringify({'Test::Synthetic calibration check':{everyone:{attempts:20,correct:20,sessions:['1','2','3','4','5']}}}));assert.equal(host.__engineTest.difficultyEstimate('Test',item,pool).tier,1);assert.match(host.__engineTest.difficultyEstimate('Test',item,pool).status,/Observed/);
host.__engineTest.buildBoard(host.__engineTest.getConfig());assert.match(el(host,'contentRotationStatus').textContent,/appeared/);assert.deepEqual(errors,[]);
console.log('PASS everyone answers privately, simultaneous scoring, no speed bonus, no Daily Doubles, partial-submission recovery, discussion pacing, rotating chooser, pass/timeout, reconnect control, formatting normalization, numeric mismatch protection, and observed evidence.');host.close();a.close();b.close();
