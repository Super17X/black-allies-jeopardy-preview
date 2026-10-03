
(function(){
  const API={};
  let root,bubble,timer,enabled=true,sound=true;
  const lines={
    greet:["Welcome to Black & Allies Jeopardy!","Players, get ready!","Let’s make it a great game!"],
    choose:["Choose a category!","You’re in control — pick a clue.","Board is yours!"],
    correct:["That’s correct!","Yes! Put it on the board!","You got it!"],
    wrong:["Not quite!","That one got away.","Watch for the steal!"],
    steal:["Steal opportunity!","Seven seconds… then the steal opens!","Get ready to steal!"],
    daily:["DAILY DOUBLE!","Big moment — Daily Double!"],
    final:["It’s Final Jeopardy time!","Make those wagers count!"],
    winner:["We have our winner!","What a game!","Give it up for our champion!"],
    buzz:["Buzzed in!","Fastest finger!","You got the buzzer!"],
    stealopen:["Steal is open — buzz now!","Take your shot — steal is live!","Steal window is open!"],
    pass:["Passed — next player get ready!","Passing it over!","Next player, be ready!"],
    timeout:["Time!","Clock ran out!","Out of time!"]
  };
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function speak(text){
    if(!sound || !("speechSynthesis" in window)) return;
    try{speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text);u.rate=1.02;u.pitch=.96;u.volume=.82;speechSynthesis.speak(u)}catch(e){}
  }
  API.show=function(text,type=""){
    if(!enabled||!root)return;
    root.classList.remove("bh-correct","bh-wrong","bh-daily","bh-buzz","bh-steal","bh-pass","bh-timeout","bh-final","bh-winner");
    if(type) root.classList.add("bh-"+type);
    bubble.textContent=text;bubble.classList.add("show");
    clearTimeout(timer);timer=setTimeout(()=>bubble.classList.remove("show"),4200);
  };
  API.event=function(name,detail={}){
    const a=lines[name]; if(!a)return;
    const text=detail.text||pick(a);
    const reaction = ({correct:"correct",wrong:"wrong",daily:"daily",buzz:"buzz",steal:"steal",stealopen:"steal",pass:"pass",timeout:"timeout",final:"final",winner:"winner"})[name] || "";
    API.show(text,reaction);
    if(detail.voice) speak(text);
  };
  API.init=function(){
    if(document.getElementById("bobblehead-widget"))return;
    root=document.createElement("div");root.id="bobblehead-widget";
    root.innerHTML='<div class="bh-bubble" aria-live="polite"></div><div class="bh-stage" role="button" tabindex="0" aria-label="Game host mascot"><img class="bh-body-image" src="bobblehead-widget/assets/derrick-body.png" alt=""><img class="bh-head-image" src="bobblehead-widget/assets/derrick-head.png" alt="Bobblehead game host"><div class="bh-boss-plaque" aria-hidden="true">BOSS MOVE</div></div><div class="bh-controls"><button type="button" data-bh="mute">Voice: Off</button><button type="button" data-bh="hide">Hide</button></div>';
    document.body.appendChild(root);bubble=root.querySelector(".bh-bubble");
    const stage=root.querySelector(".bh-stage"); stage.onclick=()=>{stage.blur();API.event("choose")};
    root.querySelector('[data-bh="mute"]').onclick=e=>{sound=!sound;e.currentTarget.textContent=sound?"Voice: On":"Voice: Off"};
    root.querySelector('[data-bh="hide"]').onclick=()=>{enabled=false;root.classList.add("bh-hidden")};
    setTimeout(()=>API.event("greet"),650);
  };
  window.BobbleHost=API;
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",API.init):API.init();
})();
