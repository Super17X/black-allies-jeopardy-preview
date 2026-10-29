(() => {
  const ticker=document.getElementById('leaderboardTicker');
  const track=document.getElementById('leaderboardTickerTrack');
  if(!ticker || !track)return;
  const button=document.createElement('button');
  button.type='button';button.className='allScoresButton';button.textContent='All scores';
  button.setAttribute('aria-haspopup','dialog');ticker.append(button);
  const dialog=document.createElement('dialog');dialog.id='allScoresDialog';
  dialog.setAttribute('aria-labelledby','allScoresTitle');
  dialog.innerHTML='<header><h2 id="allScoresTitle">All scores</h2><button type="button" class="btn">Close</button></header><p>Live standings · game continues while this panel is open.</p><label for="allScoresSearch">Find a player or team</label><input id="allScoresSearch" type="search" placeholder="Search names"><div id="allScoresCount" role="status"></div><div id="allScoresRows"></div>';
  document.body.append(dialog);
  const search=dialog.querySelector('input'),rows=dialog.querySelector('#allScoresRows'),count=dialog.querySelector('#allScoresCount');
  function render(){
    const entries=[...track.querySelectorAll('.tickerPlayer')];
    const query=search.value.trim().toLocaleLowerCase();
    const filtered=entries.filter(e=>e.textContent.toLocaleLowerCase().includes(query));
    // Reuse ranked game markup: this panel never maintains a separate score store.
    rows.replaceChildren(...filtered.map(e=>e.cloneNode(true)));
    count.textContent=filtered.length+' of '+entries.length+' standings';
    if(!filtered.length)rows.textContent='No matching players or teams.';
  }
  button.addEventListener('click',()=>{search.value='';render();dialog.showModal();search.focus();});
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());
  search.addEventListener('input',render);
  new MutationObserver(()=>{if(dialog.open)render();}).observe(track,{childList:true,subtree:true,characterData:true});
  // Do not leave a blocking panel open when the board hides for a clue or reset.
  new MutationObserver(()=>{if(ticker.hidden&&dialog.open)dialog.close();}).observe(ticker,{attributes:true,attributeFilter:['hidden']});
})();
