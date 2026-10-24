const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const dom=new JSDOM('<!doctype html><style>'+fs.readFileSync('assets/score-ticker.css','utf8')+'</style><body><section id="boardPane" style="display:none"></section><div id="leaderboardTicker"><div class="tickerLabel">Scores</div><div class="tickerViewport"><div class="tickerTrack"><span class="tickerPlayer">Chris <strong>$200</strong></span></div></div></div><div id="hostMascotV4B"></div></body>',{runScripts:'outside-only'});
 const w=dom.window,d=w.document;let latest;
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.requestAnimationFrame=f=>w.setTimeout(f,0);w.cancelAnimationFrame=w.clearTimeout;
 w.HTMLElement.prototype.getBoundingClientRect=()=>({width:1000});
 w.HTMLElement.prototype.animate=function(_,timing){return latest={currentTime:0,effect:{getTiming:()=>timing},cancel(){},pause(){this.paused=true},play(){this.paused=false}}};
 w.eval(fs.readFileSync('assets/score-ticker.js','utf8'));
 const board=d.getElementById('boardPane'),ticker=d.getElementById('leaderboardTicker'),mascot=d.getElementById('hostMascotV4B');
 const tick=()=>new Promise(r=>w.setTimeout(r,15));
 assert(ticker.hidden,'Hidden on initial lobby');
 board.style.display='block';await tick();assert(!ticker.hidden);assert.equal(mascot.parentElement.id,'boardMascotRail');assert(!board.contains(mascot));assert.equal(ticker.previousElementSibling.id,'boardStage');assert.equal(w.getComputedStyle(ticker).position,'relative');
 assert.equal(d.querySelectorAll('.tickerGroup').length,1,'No cloned player lists');
 latest.currentTime=1234;d.querySelector('.tickerTrack').innerHTML='<span class="tickerPlayer">Chris <strong>$400</strong></span>';await tick();assert.equal(latest.currentTime,1234,'Score update preserves travel');
 d.querySelector('.tickerPause').click();assert(latest.paused);
 for(const page of ['question','Final Jeopardy','results','lobby']){board.style.display='none';await tick();assert(ticker.hidden,'Hidden on '+page);assert.equal(mascot.parentElement,d.body);board.style.display='block';await tick();assert(!ticker.hidden);}
 assert(!d.querySelector('[data-reaction]'),'No Wrong or Steal buttons');
 d.querySelector('.tickerTrack').innerHTML='<span class="tickerPlayer">Player A $0</span><span class="tickerPlayer">Player B $0</span>';await tick();assert.equal(d.querySelectorAll('.tickerPlayer').length,2,'Two players appear exactly twice total, one entry each');
 console.log('PASS board-only visibility, mascot outside frame, normal-flow ticker, score travel, pause and page transitions');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
