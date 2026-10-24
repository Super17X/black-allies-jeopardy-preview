(() => {
  const root=document.getElementById('leaderboardTicker');
  if(!root)return;
  const track=root.querySelector('.tickerTrack'), viewport=root.querySelector('.tickerViewport');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const button=document.createElement('button');
  button.type='button';button.className='tickerPause';button.textContent='Pause';button.setAttribute('aria-label','Pause score ticker');button.setAttribute('aria-pressed','false');root.append(button);
  const summary=document.createElement('span');summary.className='tickerSr';summary.setAttribute('role','status');root.append(summary);
  let animation,paused=false,hovered=false,source='',frame;
  function syncPause(){if(animation)(paused||hovered?animation.pause():animation.play());button.textContent=paused?'Play':'Pause';button.setAttribute('aria-pressed',String(paused));button.setAttribute('aria-label',paused?'Play score ticker':'Pause score ticker');}
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
        // Fill one complete cycle even with a single player or an ultrawide display.
        const unit=group.getBoundingClientRect().width;
        if(unit>0){
          const repeats=Math.max(1,Math.ceil(viewport.clientWidth/unit));
          for(let i=1;i<repeats;i++){const copy=document.createElement('span');copy.className='tickerGroup';copy.setAttribute('aria-hidden','true');copy.innerHTML=source;group.append(copy);}
          const width=group.getBoundingClientRect().width;
          const clone=group.cloneNode(true);clone.setAttribute('aria-hidden','true');track.append(clone);
          animation=track.animate([{transform:'translateX(0)'},{transform:`translateX(-${width}px)`}],{duration:width/55*1000,iterations:Infinity,easing:'linear'});
          animation.currentTime=(offset%width)/55*1000;syncPause();
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
  refresh();
})();
