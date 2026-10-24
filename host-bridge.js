(function(){
 window.JeopardyRemoteHost={init(api){
  let wire=null,secret=null,enabled=false,lastSeen=0,autoId=0;const processed=new Map();
  const storeKey='jeopardy-mobile-host-key-'+api.room;
  const replayKey='jeopardy-mobile-host-replays-'+api.room;
  try{for(const [id,result]of JSON.parse(sessionStorage.getItem(replayKey)||'[]'))processed.set(id,result);}catch(_){}
  function saveProcessed(){try{sessionStorage.setItem(replayKey,JSON.stringify([...processed].slice(-500).map(([id,r])=>[id,{ok:r.ok,message:r.message}])));}catch(_){}}
  const status=document.createElement('p');status.id='mobileHostStatus';status.textContent='Mobile host access is off.';
  const pair=document.createElement('button');pair.id='pairMobileHost';pair.className='btn';pair.textContent='Host-only QR / mobile controls';
  const revoke=document.createElement('button');revoke.id='revokeMobileHost';revoke.className='btn';revoke.textContent='Revoke mobile host access';
  const drawer=document.getElementById('hostDrawer');const pairingTools=document.createElement("section");pairingTools.append(pair,revoke,status);if(drawer.firstElementChild)drawer.firstElementChild.after(pairingTools);else drawer.append(pairingTools);
  const dialog=document.createElement('dialog');dialog.id='mobileHostPairing';dialog.innerHTML='<h2>Private host controls</h2><p>Keep this QR off the projector. Anyone with this link can control the game. Player QR codes do not grant host access.</p><div id="mobileHostQr"></div><a id="mobileHostLink" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Open private host controls</a><p>Keep this board tab open. Revoke access when the event ends.</p><button type="button" id="closeMobileHostPairing">Close</button>';document.body.append(dialog);
  document.getElementById('closeMobileHostPairing').onclick=()=>dialog.close();
  async function activate(){if(!window.JeopardyHostWire)throw Error('Host connection unavailable.');secret=sessionStorage.getItem(storeKey)||window.JeopardyHostWire.randomKey();sessionStorage.setItem(storeKey,secret);wire=await window.JeopardyHostWire.open(api.room,secret);enabled=true;status.textContent='Private host link active · waiting for host phone.';}
  pair.onclick=async()=>{try{await activate();const url=new URL('host.html',location.href);url.searchParams.set('room',api.room);url.hash='key='+secret;const link=document.getElementById('mobileHostLink');link.href=url.href;link.textContent='Open private host controls';const target=document.getElementById('mobileHostQr');target.textContent='';if(typeof window.qrcode==='function'){const qr=window.qrcode(0,'L');qr.addData(url.href,'Byte');qr.make();target.innerHTML=qr.createSvgTag({cellSize:5,margin:20,scalable:true});}else target.textContent='QR unavailable. Use the private host link.';dialog.showModal();}catch(e){status.textContent='Secure pairing requires HTTPS and Web Crypto. Use board controls on this device.';}};
  revoke.onclick=()=>{enabled=false;wire=null;secret=null;processed.clear();sessionStorage.removeItem(replayKey);sessionStorage.removeItem(storeKey);document.getElementById('mobileHostLink').removeAttribute('href');document.getElementById('mobileHostQr').textContent='Access revoked.';status.textContent='Mobile host access revoked. Generate a new QR to pair again.';};
  if(sessionStorage.getItem(storeKey))activate().catch(()=>{});
  const excluded=new Set(['pairMobileHost','revokeMobileHost','fullscreenBtn','hostFab','closeHostDrawer']);
  function roots(){const result=[{name:'Host controls',el:drawer}];for(const id of ['lobbyPane','waitingRoomPane','boardPane','qaPane','finalPane','summaryPane','systemCheckModal','liveEngineModal','privacyScreen','buzzerPanel']){const el=document.getElementById(id);if(el&&el.style.display!=='none'&&getComputedStyle(el).display!=='none')result.push({name:({lobbyPane:'Game setup',waitingRoomPane:'Waiting room',boardPane:'Choose a clue',qaPane:'Current clue',finalPane:'Final Jeopardy',summaryPane:'Results',systemCheckModal:'Diagnostics',liveEngineModal:'Engine monitor',privacyScreen:'Privacy screen',buzzerPanel:'Player joining'})[id],el});}document.querySelectorAll('dialog[open]:not(#mobileHostPairing)').forEach(el=>result.push({name:'Help',el}));return result;}
  function visible(el,root){for(let n=el;n&&n!==root;n=n.parentElement)if(n.hidden||n.style.display==='none')return false;return !el.hidden&&el.type!=='hidden';}
  function candidates(){return roots().flatMap(g=>[...g.el.querySelectorAll('button,input,select,textarea')].filter(el=>!excluded.has(el.id)&&visible(el,g.el)).map(el=>{if(!el.id)el.id='mobile-host-control-'+(++autoId);const setup=el.closest(".setup-group");return {el,group:setup?setup.querySelector("summary strong")?.textContent||g.name:g.name};}));}
  function describe({el,group}){const label=el.tagName==='BUTTON'?(el.getAttribute('aria-label')||el.textContent.trim()):document.querySelector('label[for="'+el.id+'"]')?.textContent.trim()||el.closest('label')?.textContent.trim()||el.getAttribute('aria-label')||el.placeholder||el.id;return {id:el.id,group,label,tag:el.tagName,type:el.type,value:el.value,checked:!!el.checked,disabled:!!el.disabled||(api.canUse&&!api.canUse(el)),readOnly:!!el.readOnly,options:el.options?[...el.options].map(o=>({value:o.value,label:o.textContent,disabled:o.disabled})):null,accept:el.accept||'',min:el.min,max:el.max,step:el.step};}
  async function send(payload){if(enabled&&wire)api.send(await wire.encode('board',payload));}
  function snapshot(){return {context:api.context(),phase:api.phase(),room:api.room,controls:candidates().map(describe),notes:api.notes(),current:api.current?api.current():"",next:api.next?api.next():"Use the available controls below.",fullscreenNote:'Full screen requires a click on the board device.',serverTime:Date.now()};}
  async function handle(packet){if(!enabled||!wire)return;let req;try{req=await wire.decode('phone',packet);}catch(_){return;}if(!req.id||!Number.isFinite(req.expiresAt)||req.expiresAt<Date.now()||req.expiresAt>Date.now()+30000)return;
   lastSeen=Date.now();status.textContent='Host phone connected · encrypted controls';
   if(processed.has(req.id)){await send({type:'result',id:req.id,...processed.get(req.id),snapshot:snapshot()});return;}
   if(req.action==='sync'){await send({type:'snapshot',id:req.id,snapshot:snapshot()});return;}
   let result={ok:false,message:'The turn changed. Sync and try again.'};
   processed.set(req.id,{ok:false,message:'An earlier copy of this command was received. Check current state before issuing it again.'});saveProcessed();
   if(req.context===api.context())try{
    if(req.action==='export'){result={ok:true,message:'Recovery exported.',recovery:api.exportRecovery()};}
    else if(req.action==='import'){if(!req.confirmed||typeof req.text!=='string'||req.text.length>2500000)throw Error('Confirm a valid recovery file.');api.importRecovery(JSON.parse(req.text));result={ok:true,message:'Recovery imported.'};}
    else{const entry=candidates().find(x=>x.el.id===req.control);if(!entry||entry.el.disabled||(api.canUse&&!api.canUse(entry.el)))throw Error('This control is not currently available.');const el=entry.el;
     if(req.action==='change'&&!el.readOnly&&['INPUT','SELECT','TEXTAREA'].includes(el.tagName)&&el.type!=='file'){
      if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(req.value)&&!o.disabled))throw Error('Choose an available option.');
      if(String(req.value||'').length>10000)throw Error('Value is too long.');
      if(el.type==='checkbox')el.checked=!!req.checked;else el.value=String(req.value??'');
      el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));
     }else if(req.action==='click'&&el.tagName==='BUTTON'){
      if(el.id==='exportRecovery'){result={ok:true,message:'Recovery exported.',recovery:api.exportRecovery()};}
      else if(['diagnosticsBtn','liveEngineBtn'].includes(el.id)){api.monitor(el.id);}
      else{const confirmOriginal=window.confirm;window.confirm=()=>!!req.confirmed;try{el.click();}finally{window.confirm=confirmOriginal;}}
     }else throw Error('Unsupported host action.');
     if(!result.ok)result={ok:true,message:'Applied.'};
    }
   }catch(e){result={ok:false,message:e.message||'Action could not be applied.'};}
   processed.set(req.id,result);if(processed.size>500)processed.delete(processed.keys().next().value);saveProcessed();await send({type:'result',id:req.id,...result,snapshot:snapshot()});
  }
  setInterval(()=>{if(enabled&&lastSeen&&Date.now()-lastSeen>10000)status.textContent='Host phone disconnected · board remains authoritative.';},3000);
  return {handle,snapshot};
 }};
})();
