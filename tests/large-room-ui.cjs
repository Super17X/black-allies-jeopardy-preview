const {JSDOM}=require('jsdom');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
const dom=new JSDOM('<body><div id="leaderboardTicker"><div id="leaderboardTickerTrack"></div></div>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
w.HTMLDialogElement.prototype.close=function(){this.open=false};
const track=d.getElementById('leaderboardTickerTrack');
function populate(n){track.replaceChildren(...Array.from({length:n},(_,i)=>{const e=d.createElement('span');e.className='tickerPlayer';e.textContent=`${i+1} Test Player ${String(i+1).padStart(2,'0')} — $${i*200}`;return e}));}
populate(35);w.eval(fs.readFileSync('assets/large-room-ui.js','utf8'));
d.querySelector('.allScoresButton').click();const dialog=d.querySelector('dialog'),search=d.querySelector('input');
assert(dialog.open);assert.equal(d.querySelector('#allScoresRows').children.length,35);
search.value='Player 35';search.dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('#allScoresRows').children.length,1);assert.match(d.querySelector('#allScoresRows').textContent,/6800/);
track.lastChild.textContent='35 Test Player 35 — $9000';await new Promise(r=>w.setTimeout(r,0));assert.match(d.querySelector('#allScoresRows').textContent,/9000/);
search.value='<img>';search.dispatchEvent(new w.Event('input'));assert.match(d.querySelector('#allScoresRows').textContent,/No matching/);assert(!d.querySelector('#allScoresRows img'));
search.value='';search.dispatchEvent(new w.Event('input'));populate(4);await new Promise(r=>w.setTimeout(r,0));assert.equal(d.querySelector('#allScoresRows').children.length,4,'team counts follow ranked markup');
d.querySelector('#leaderboardTicker').hidden=true;await new Promise(r=>w.setTimeout(r,0));assert(!dialog.open);dom.window.close();console.log('PASS 35 standings, search, live score changes, empty results, team counts and close on board exit.');
})();
