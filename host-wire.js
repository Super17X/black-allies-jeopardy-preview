/* Host capabilities stay in the URL fragment and encrypted messages, never player state. */
(function(){
 const to64=b=>{const bytes=new Uint8Array(b);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
 const from64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 window.JeopardyHostWire={randomKey(){return to64(crypto.getRandomValues(new Uint8Array(32)));},async open(room,secret){
  if(!crypto.subtle||!/^[A-Za-z0-9_-]{43}$/.test(secret))throw Error('A secure host link is required.');
  const key=await crypto.subtle.importKey('raw',from64(secret),'AES-GCM',false,['encrypt','decrypt']);
  return {async encode(role,payload){const iv=crypto.getRandomValues(new Uint8Array(12)),aad=new TextEncoder().encode('jeopardy-host-v1|'+room+'|'+role);const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,new TextEncoder().encode(JSON.stringify(payload)));return {type:'host-secure',room,role,iv:to64(iv),ciphertext:to64(data)};},async decode(role,msg){if(msg.type!=='host-secure'||msg.room!==room||msg.role!==role||typeof msg.ciphertext!=='string'||msg.ciphertext.length>4000000)throw Error('Invalid host message');const aad=new TextEncoder().encode('jeopardy-host-v1|'+room+'|'+role);return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(msg.iv),additionalData:aad},key,from64(msg.ciphertext))));}};
 }};
})();
