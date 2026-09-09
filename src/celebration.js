const base=import.meta.env.BASE_URL;
const rewardImages={5:'reward-5.png',10:'reward-10.png',15:'reward-15.png',20:'reward-20.png',25:'reward-25.png',28:'reward-28.png',32:'reward-32.png',35:'reward-35.png'};
let audio=new Audio(`${base}assets/celebration.mp3`),context,buffer,source,dialog,lastFocus,raf,timer;
audio.preload='auto';
// Resume during the visit button's user gesture, before awaiting the database.
export function unlockSound(){
 try{context??=new(window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});
 if(!buffer)fetch(`${base}assets/celebration.mp3`).then(r=>r.arrayBuffer()).then(b=>context.decodeAudioData(b)).then(b=>buffer=b).catch(()=>{});
 }catch{}
}
function play(){
 if(context&&buffer&&context.state==='running'){source?.stop();source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.start();return;}
 audio.currentTime=0;audio.play().catch(()=>{dialog.querySelector('[data-sound]').hidden=false;});
}
export function celebrate(prize,cut){
 closeCelebration();lastFocus=document.activeElement;
 dialog=document.createElement('dialog');dialog.className='celebration';dialog.setAttribute('aria-labelledby','congratsTitle');
 dialog.innerHTML=`<canvas aria-hidden="true"></canvas><section class="prize-card"><p class="prize-eyebrow">FAMILIA AB · CORTE <span data-cut></span></p><h1 id="congratsTitle">Congratulations!</h1><div class="prize-picture"><img alt="Celebración AB Premier"></div><p class="won-label">¡Te ganaste!</p><h2 data-prize></h2><p class="prize-thanks">Gracias por ser parte de la familia AB.</p><button type="button" data-sound hidden>▶ Escuchar celebración</button><button type="button" data-close>¡Gracias! Continuar</button></section>`;
 dialog.querySelector('[data-prize]').textContent=prize;dialog.querySelector('[data-cut]').textContent=cut;
 const img=dialog.querySelector('img');img.onerror=()=>{img.onerror=null;img.src=`${base}foto1.jpg`;img.onerror=()=>{img.onerror=null;img.src=`${base}assets/logo-ab-premiere.png`;};};img.src=rewardImages[cut]?`${base}assets/${rewardImages[cut]}`:`${base}foto1.jpg`;
 dialog.querySelector('[data-close]').onclick=closeCelebration;dialog.querySelector('[data-sound]').onclick=()=>{unlockSound();play();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeCelebration();});
 document.body.append(dialog);dialog.showModal();document.body.classList.add('celebrating');play();
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)confetti(dialog.querySelector('canvas'));
}
function confetti(canvas){
 const ctx=canvas.getContext('2d'),w=innerWidth,h=innerHeight,dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
 const colors=['#d7ae56','#fff1c2','#ffffff','#51c292','#e396c7'];
 const particles=Array.from({length:150},()=>({x:Math.random()*w,y:-Math.random()*h,v:70+Math.random()*180,angle:Math.random()*6.28,spin:Math.random()*4-2,color:colors[Math.floor(Math.random()*colors.length)]}));
 let start=performance.now(),prev=start;
 function draw(now){const dt=Math.min((now-prev)/1000,.05);prev=now;ctx.clearRect(0,0,w,h);
 for(const p of particles){p.y+=p.v*dt;p.x+=Math.sin(p.angle)*35*dt;p.angle+=p.spin*dt;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.fillRect(-4,-6,8,12);ctx.restore();if(p.y>h&&now-start<5000)p.y=-20;}
 if(now-start<10000)raf=requestAnimationFrame(draw);else ctx.clearRect(0,0,w,h);
 }raf=requestAnimationFrame(draw);
}
export function closeCelebration(){cancelAnimationFrame(raf);clearTimeout(timer);source?.stop();source=null;audio.pause();dialog?.remove();dialog=null;document.body.classList.remove('celebrating');lastFocus?.focus();}
