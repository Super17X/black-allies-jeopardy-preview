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
click(host,'enterPremiereBtn');el(host,'missScoring').value='traditional';el(host,'educationalMode').checked=true;el(host,'educationalMode').dispatchEvent(new host.Event('change'));
for(const [w,n]of [[a,'Alpha'],[b,'Beta']]){fill(w,'nameInput',n);click(w,'joinBtn')}
el(host,'dailyDoubles').value='off';click(host,'enterWaitingRoomBtn');click(a,'readyBtn');click(b,'readyBtn');advance(14000);
host.document.querySelector('#boardGrid button:not(:disabled)').click();advance(1);assert.equal(st.phase,'READING');advance(10000);assert.equal(st.phase,'READING');click(host,'openCompetitiveBuzz');assert.equal(st.phase,'BUZZ_OPEN');click(a,'buzzerBtn');assert.equal(st.timer.id,null);
const value=st.board.valueForRow(Number(st.activeKey.split('::')[1]));fill(a,'remoteAnswerInput','wrong');click(a,'submitAnswerBtn');assert.equal(st.players[0].score,-value);fill(host,'overrideReason','Accepted alternate');click(host,'overrideCorrect');assert.equal(st.players[0].score,value);assert.deepEqual(errors,[]);
let dd;for(const c of st.board.categories){for(const r of st.board.rows){const k=st.board.keyFor(c,r);if(!st.used.has(k)){dd={c,r,k};break;}}if(dd)break;}
st.board.dailyDoubles.add(dd.k);host.document.querySelectorAll('#boardGrid button')[st.board.rows.indexOf(dd.r)*st.board.categories.length+st.board.categories.indexOf(dd.c)].click();advance(1);assert.equal(st.phase,'DD_WAGER');fill(a,'ddMobileWager','50');click(a,'ddMobileSubmit');const beforeDD=st.players[0].score;fill(a,'remoteAnswerInput','wrong');click(a,'submitAnswerBtn');assert.equal(st.players[0].score,beforeDD-50);advance(4000);assert.notEqual(st.phase,'STEAL_OPEN');
console.log('PASS untimed competitive reading control, fresh untimed answer turn, traditional deduction and exact scoring correction.');host.close();a.close();b.close();
