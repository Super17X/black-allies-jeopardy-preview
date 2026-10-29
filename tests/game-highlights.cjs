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
 for(const script of w.document.querySelectorAll('script'))if(!script.src&&script.textContent.trim())w.eval(file==='index.html'?script.textContent.replace('  })();','window.__engineTest={state,recordDecision,renderGameHighlights,highlightEvents,highlightWager,overrideDecision,resetGame,undoLast,pushUndo,premiereSave,restoreSession,isCorrectAnswer,buildBoard,getConfig,difficultyEstimate,learningFor,get finalJeopardy(){return finalJeopardy},decisionHistory,engineQuestionId,beginFinalAnswers,startFinalJeopardy,broadcastGameplaySync,answers:()=>{const [c,r]=state.activeKey.split("::");return state.board.clueFor(c,Number(r)).answers;}};  })();'):script.textContent);
 return w;
}


const host=setup('index.html');advance(1);const api=host.__engineTest;
api.state.players=[{name:'Alpha',score:0},{name:'Beta',score:0},{name:'<img src=x>',score:0}];
for(let i=0;i<120;i++)api.recordDecision('Alpha','correct',true,200,'clue-'+i);
api.recordDecision('Beta','correct',true,400,'beta');api.highlightEvents.at(-1).steal=true;api.highlightEvents.at(-1).dailyDouble=true;
api.highlightWager('Alpha',1000,'final');api.highlightWager('Beta',1000,'daily-double');
api.recordDecision('Beta','right',true,1000,null,'final');api.recordDecision('Alpha','right',true,1,null,'tiebreak');
api.highlightEvents.push({event:'buzz',player:'Beta'});
api.renderGameHighlights();let text=host.document.getElementById('gameHighlights').textContent;
assert.match(text,/120 correct answers/);assert.match(text,/24,000 earned/);assert.match(text,/Shared award/);assert.match(text,/1 successful steals/);assert.match(text,/1 Daily Double wins/);
assert.equal(host.document.querySelectorAll('#gameHighlights').length,1);assert(!host.document.querySelector('#gameHighlights img'));
api.state.final.step='complete';const decision=api.decisionHistory.find(d=>d.player==='Beta'&&d.kind==='final');
host.document.getElementById('overrideDecision').value=decision.id;host.document.getElementById('overrideReason').value='test correction';api.overrideDecision(false);
text=host.document.getElementById('gameHighlights').textContent;assert(!text.includes('+$1,000 in Final'));
api.premiereSave();const saved=JSON.parse(host.localStorage.getItem('jeopardy-complete-session-v3-TEST01'));assert(saved.highlightEvents.length>120);
api.restoreSession(saved);assert.match(host.document.getElementById('gameHighlights').textContent,/120 correct answers/);
// Restore creates distinct review objects: corrections must still update the award ledger.
host.document.getElementById('overrideDecision').value=decision.id;host.document.getElementById('overrideReason').value='restore correction';api.overrideDecision(true);assert.match(host.document.getElementById('gameHighlights').textContent,/1,000 in Final/);
api.state.board=api.buildBoard(api.getConfig());api.pushUndo('test answer');api.recordDecision('Beta','new',true,9000,'undo');api.undoLast();assert(!api.highlightEvents.some(e=>e.key==='undo'));
api.resetGame();assert.equal(api.highlightEvents.length,0);api.renderGameHighlights();assert.match(host.document.getElementById('gameHighlights').textContent,/Not earned this game/);
assert.deepEqual(errors,[]);host.close();console.log('PASS full-game awards beyond 100 decisions, ties, wagers, steals, Daily Doubles, tiebreak exclusion, corrections before/after restore, escaping, undo and reset.');
