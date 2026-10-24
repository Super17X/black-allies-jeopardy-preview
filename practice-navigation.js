(function(){
 const sanitize=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
 function context(){const params=new URLSearchParams(location.search);let room=sanitize(params.get('room')||params.get('r')),role=params.get('return')==='board'?'board':'player';
  if(!room)try{const saved=JSON.parse(sessionStorage.getItem('jeopardy-practice-return')||'null');room=sanitize(saved?.room);role=saved?.role==='board'?'board':'player';}catch(_){}
  if(!room&&document.referrer)try{const from=new URL(document.referrer);if(from.origin===location.origin&&from.pathname.endsWith('/buzzer.html'))room=sanitize(from.searchParams.get('room')||from.searchParams.get('r'));}catch(_){}
  return {room,role};
 }
 function wireLinks(room,role){room=sanitize(room);if(!room)return;document.querySelectorAll('a[href]').forEach(a=>{let url;try{url=new URL(a.getAttribute('href'),location.href);}catch(_){return;}if(url.origin!==location.origin||!url.pathname.endsWith('/practice.html'))return;url.searchParams.set('room',room);url.searchParams.set('return',role);a.href=url.href;
   a.target=role==='board'?'_blank':'_self';a.rel=role==='board'?'opener':'noopener';
   a.addEventListener('click',()=>{sessionStorage.setItem('jeopardy-practice-return',JSON.stringify({room,role}));});
  });
 }
 function setupReturn(){const link=document.getElementById('practiceBack');if(!link)return;const {room,role}=context(),status=document.getElementById('practiceReturnStatus');
  if(!room){link.removeAttribute('href');link.textContent='Return to your original game tab';status.textContent='No room was provided. Reopen your original player tab or scan its player QR; this page will not start a new game.';return;}
  if(role==='player'){const url=new URL('buzzer.html',location.href);url.searchParams.set('room',room);link.href=url.href;link.target='_self';link.textContent='Back to my game · '+room;status.textContent='Returns to your existing room and saved player identity. Live scores and the current turn sync from the board.';}
  else{link.href='#';link.textContent='Back to the current board · '+room;link.onclick=e=>{e.preventDefault();try{if(window.opener&&!window.opener.closed&&window.opener.location.origin===location.origin&&sanitize(window.opener.sessionStorage.getItem('jeopardy-room'))===room){window.opener.focus();window.close();return;}}catch(_){}status.textContent='Switch to the original board tab for room '+room+'. This practice page will not open a second board or start a new game.';};}
 }
 window.JeopardyPracticeNav={wireLinks,setupReturn,context};if(location.pathname.endsWith('/practice.html'))setupReturn();
})();
