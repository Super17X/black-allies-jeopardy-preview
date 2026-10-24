(() => {
  const root=document.getElementById('leaderboardTicker');
  if(!root)return;
  const track=root.querySelector('.tickerTrack'), viewport=root.querySelector('.tickerViewport');
  // Reserve real document space for the board, mascot and separate ticker row.
  const board=document.getElementById('boardPane'), mascot=document.getElementById('hostMascotV4B');
  let stage, rail, mascotHome;
  if(board){
    stage=document.createElement('div');stage.id='boardStage';board.before(stage);stage.append(board);
    rail=document.createElement('aside');rail.id='boardMascotRail';rail.setAttribute('aria-label','Game host');stage.append(rail);
    if(mascot){mascotHome=document.createComment('Original mascot position');mascot.before(mascotHome);}
    stage.after(root);
  }
  root.hidden=true;
  const label=root.querySelector('.tickerLabel');if(label)label.textContent='SCORES';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const button=document.createElement('button');
  button.type='button';button.className='tickerPause';button.textContent='Pause';button.setAttribute('aria-label','Pause score ticker');button.setAttribute('aria-pressed','false');root.append(button);
  const summary=document.createElement('span');summary.className='tickerSr';summary.setAttribute('role','status');root.append(summary);
  let animation,paused=false,hovered=false,source='',frame;
  function syncPause(){if(animation)(paused||hovered||root.hidden?animation.pause():animation.play());button.textContent=paused?'Play':'Pause';button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Play score ticker':'Pause score ticker');}
  function refresh(fromGame=false){
    // Render from the game's existing ranked score markup; never create another score store.
    const original=track.querySelector('.tickerGroup');
    if(fromGame||!original)source=track.innerHTML;
    // Keep pixel travel stable across score changes, rather than jumping by a cycle percentage.
    const offset=animation?Number(animation.currentTime||0)*55/1000:0;
    if(animation)animation.cancel();
    observer.disconnect();track.replaceChildren();
    const group=document.createElement('div');group.className='tickerGroup';group.innerHTML=source;track.append(group);
    const hasPlayers=!!group.querySelector('.tickerPlayer');root.classList.toggle('tickerReduced',reduced.matches);
    if(!hasPlayers){group.classList.add('tickerEmpty');button.hidden=true;}
    else{
      summary.textContent=group.textContent;button.hidden=reduced.matches;
      if(!reduced.matches&&typeof track.animate==='function'){
        // One real entry per player. The whole list exits before starting its next pass.
        const width=group.getBoundingClientRect().width;
        const start=viewport.clientWidth;
        const distance=start+width;
        if(width>0&&distance>0){
          animation=track.animate([{transform:`translateX(${start}px)`},{transform:`translateX(-${width}px)`}],{duration:distance/55*1000,iterations:Infinity,easing:'linear'});
          animation.currentTime=(offset%distance)/55*1000;syncPause();
        }
      }
    }
    observer.observe(track,{childList:true});
  }
  const observer=new MutationObserver(()=>refresh(true));
  button.addEventListener('click',()=>{paused=!paused;syncPause()});
  root.addEventListener('mouseenter',()=>{hovered=true;syncPause()});root.addEventListener('mouseleave',()=>{hovered=false;syncPause()});
  const resize=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh)};
  window.addEventListener('resize',resize);reduced.addEventListener('change',()=>refresh());
  function syncBoardPage(){
    const visible=!!board&&getComputedStyle(board).display!=='none'&&!board.hidden;
    root.hidden=!visible;
    if(stage)stage.classList.toggle('boardStageActive',visible);
    if(mascot&&rail){
      if(visible&&mascot.parentNode!==rail)rail.append(mascot);
      else if(!visible&&mascotHome&&mascot.parentNode===rail)mascotHome.after(mascot);
    }
    hovered=false;
    if(visible)resize();else syncPause();
  }
  if(board)new MutationObserver(syncBoardPage).observe(board,{attributes:true,attributeFilter:['style','class','hidden']});
  refresh();syncBoardPage();
})();
