/* سناریو: ایستگاه فضایی */
(function(){
scene.fog=new THREE.Fog(0x05070c,5,26);scene.background=new THREE.Color(0x03050a);
const hullM=std(0xffffff,{map:patternTex('#3a4350','#4a5564','#6a7788',64),roughness:.6}),floorM=std(0x555d68,{roughness:.5}),wallB=std(0x4c5663);
const NAMES=['ژنراتور','باتری','شبکه','فشار'],PCOLS=[0xff7a2a,0x3aa0ff,0x7aff7a,0xffd030];
/* ---- کدها ---- */
const CODE={};
CODE.n=ri(35,48);CODE.F=CODE.n*2+3;CODE.air=''+ri(1,9)+ri(1,9)+ri(1,9)+ri(1,9);CODE.layout=[0,1,2,3].sort(()=>rnd()-.5);
/* ---- چراغ‌ها ---- */
const Lq=plight(0xff3030,1.6,10,0,2.4,-1.5),Lc=plight(0x80c8ff,.5,14,0,2.6,-9),La=plight(0xfff0d0,1.2,8,6.5,2.2,-9),Lcap=plight(0xffffff,0,6,9.5,1.8,-9);
/* ---- اتاق‌ها ---- */
mkRoom({x0:-3,x1:3,z0:-5,z1:2,h:2.8,floor:floorM,wall:hullM,holes:{n:[{a0:-.8,a1:.8,y0:0,y1:2.3}]}});
mkRoom({x0:-4.5,x1:4.5,z0:-13,z1:-5.2,h:3.0,floor:floorM,wall:hullM,skip:['s'],holes:{e:[{a0:-9.8,a1:-8.4,y0:0,y1:2.3}]}});
mkRoom({x0:4.7,x1:8.4,z0:-10.4,z1:-7.8,h:2.6,floor:floorM,wall:wallB,skip:['w'],holes:{e:[{a0:-9.6,a1:-8.6,y0:0,y1:2.3}]}});
mkRoom({x0:8.6,x1:10.4,z0:-10.2,z1:-8.0,h:2.4,floor:floorM,wall:wallB,skip:['w']});
const dawn=bx(.05,2.4,2.2,new THREE.MeshBasicMaterial({color:0x10141c}),10.35,1.2,-9.1);
const door1=makeDoor('d1',-.8,-5.1,1.6,2.3,'x',Math.PI/2),door3=makeDoor('d3',4.6,-9.8,1.4,2.3,'z',Math.PI/2);
plaque('اتاق فرمان',new V3(0,2.55,-5.0),0,.7,.2,'#9fe8ff');plaque('قفل هوایی',new V3(4.49,2.5,-9.1),-Math.PI/2,.8,.2,'#ff9a9a');
/* ---- کابین خدمه ---- */
const order=[0,1,2,3],notes=['«فشار» را فقط پس از «شبکه» می‌شود وصل کرد.','«شبکه» فقط پس از «باتری» وصل می‌شود.','«باتری» فقط پس از «ژنراتور» وصل می‌شود.'];
const note=noteObj('note',{pos:[-1.0,.006,-.8],flat:true,rot:.3,label:'یادداشتِ افتاده روی زمین',paper:'#d4dae2',ink:'#10202e',lines:[
 {t:'گزارش اضطراری',size:36,color:'#a01c1c',weight:'bold'},
 'برق ایستگاه قطع شده و در کابین قفل است.',
 'برای راه انداختنِ دوبارهٔ برق، کلیدهای تابلوی کناری را باید به ترتیبِ درست بزنی:',
 notes[0],notes[1],notes[2],'اگر ترتیب را اشتباه بزنی همه از جا می‌پرند.']});
const halo=new THREE.Mesh(new THREE.RingGeometry(.2,.26,40),new THREE.MeshBasicMaterial({color:0xcfefff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.set(-1.0,.012,-.8);world.add(halo);note.onGrab=()=>{halo.visible=false};
let pressed=[];
bx(.06,1.2,2.4,M.dark,2.97,1.3,-2.1);
const levers=CODE.layout.map((idx,k)=>leverObj('pw'+idx,{pos:[2.93,1.3,-3.0+k*.5],rotY:-Math.PI/2,color:PCOLS[idx],label:'کلید '+NAMES[idx],onPress(L){if(S.power||L.on)return;
 if(pressed.length===idx){pressed.push(idx);L.set(true);if(pressed.length===4)powerOn()}
 else{pressed=[];levers.forEach(v=>v.set(false));S.wrong++;tension(.15);nb(.5,6000,1500,.5,'bandpass');buzz();toast('جرقه! همهٔ کلیدها از جا پریدند.',3500)}}}));
CODE.layout.forEach((idx,k)=>plaque(NAMES[idx],new V3(2.94,1.0,-3.0+k*.5),-Math.PI/2,.4,.1,'#'+PCOLS[idx].toString(16).padStart(6,'0')));
blk(2.7,-3.4,3.0,-.8);
function powerOn(){S.power=true;chime();toast('برق وصل شد. در به اتاق فرمان باز می‌شود.',5000);tween(2,e=>{Lq.color.setHex(0xffe8d0);Lq.intensity=1.2+e*.8;Lc.intensity=.5+e*1.3});setTimeout(()=>door1.openIt(),700)}
{const b=new THREE.Group();b.position.set(-2.4,.9,.6);world.add(b);furn(.6,.85,.6,M.metal,-2.4,.43,.6,true);const d=new THREE.Mesh(new THREE.BoxGeometry(.12,.06,.12),std(0xff4040,{emissive:0xff2020,emissiveIntensity:.6}));b.add(d);
 mkObj('bell',b,{kind:'press',label:'دکمهٔ ارتباط با زمین (راهنمایی)',use(){bellRing(b.getWorldPosition(new V3()));giveHint()}})}
decor('bed-6e10e8',{x:-2.2,z:-3.6,h:.6,w:1.0,d:1.9,col:0x44505e,solid:true});
decor('cargo-crate-696892',{x:-1.8,z:1.2,h:.8,w:.8,d:.8,col:0x7a7040,solid:true});
decor('battery-bank-b4d362',{x:2.4,z:1.1,h:1.2,w:.6,d:.6,col:0x55606a,solid:true});
decor('oxygen-tank-223f7f',{x:2.5,z:-4.4,h:1.0,w:.3,d:.3,col:0xdddddd});
/* ---- اتاق فرمان ---- */
furn(1.9,1.0,1.0,M.metal,0,.5,-8.5,true);surfaces.push({x0:-.95,x1:.95,z0:-9,z1:-8,y:1.0});
const R=[.05,.07,.075,.06,.13,.11],pOrder=[0,1,2,3,4,5].sort(()=>rnd()-.5);
const planets=pOrder.map((i,k)=>{const g=new THREE.Group();g.add(planetMesh(i,R[i]));g.position.set(-.72+k*.29,1.0+R[i],-8.5+(k%2?.2:-.2));world.add(g);return mkObj('pl'+i,g,{kind:'grab',restH:R[i],rank:i,slotable:true,label:PNAMES[i]})});
bx(.4,.06,6.4,M.wood,-4.28,.97,-9.4);bx(.06,1.2,6.4,M.dark,-4.46,1.4,-9.4);blk(-4.5,-12.6,-4.0,-6.2);
const pslots=makeSlots('p',6,-4.2,1.0,-7.0,0,-.9,.1,0x1a2030);
plaque('نزدیک‌ترین به خورشید',new V3(-4.43,1.75,-7.0),Math.PI/2,.7,.16,'#9fe8ff');plaque('دورترین',new V3(-4.43,1.75,-11.5),Math.PI/2,.5,.16,'#9fe8ff');
// نمای بیرون (ستاره‌ها)
{const c=cv(512,256),g=c.getContext('2d');g.fillStyle='#02030a';g.fillRect(0,0,512,256);const r=rngF(9);for(let i=0;i<260;i++){g.fillStyle='rgba(255,255,255,'+(.3+r()*.7)+')';g.fillRect(r()*512,r()*256,1+r()*2,1+r()*2)}
 const gr=g.createRadialGradient(400,330,60,400,330,220);gr.addColorStop(0,'#3a7ac0');gr.addColorStop(.85,'#1a3a6a');gr.addColorStop(1,'rgba(10,20,60,0)');g.fillStyle=gr;g.beginPath();g.arc(400,330,230,0,7);g.fill();
 const t=ctex(c),m=new THREE.Mesh(new THREE.PlaneGeometry(4.4,2.0),new THREE.MeshBasicMaterial({map:t}));m.position.set(0,1.9,-12.94);world.add(m);bx(4.6,.12,.1,M.dark,0,2.95,-12.92);bx(4.6,.12,.1,M.dark,0,.88,-12.92)}
plaque('ایستگاه شمارهٔ '+fa(CODE.n),new V3(3.2,2.4,-12.94),0,1.0,.22,'#9fe8ff');
// قفسه (قفل‌دار) با یادداشت
const lock=new THREE.Group();lock.position.set(4.15,0,-6.3);world.add(lock);
bx(.02,1.8,1.0,M.dark,.2,.9,0,lock);bx(.4,.02,1.0,M.dark,0,1.8,0,lock);bx(.4,.02,1.0,M.dark,0,.02,0,lock);bx(.4,1.8,.02,M.dark,0,.9,.5,lock);bx(.4,1.8,.02,M.dark,0,.9,-.5,lock);bx(.4,.02,1.0,M.dark,0,.9,0,lock);blk(3.9,-6.85,4.4,-5.75);
const ldoor=new THREE.Group();ldoor.position.set(-.2,.9,-.5);lock.add(ldoor);bx(.04,1.76,1.0,M.metal,0,0,.5,ldoor);
const lnote=noteObj('lnote',{pos:[4.15,.92,-6.3],flat:true,rot:1.2,label:'یادداشتِ داخل قفسه',paper:'#d4dae2',ink:'#10202e',enabled:()=>S.lockerOpen,lines:[
 {t:'فرکانس امدادِ زمین',size:34,color:'#a01c1c',weight:'bold'},'رادیو را روی «فرکانس نجات» تنظیم کن:','فرکانس = شمارهٔ ایستگاه × ۲ + ۳','(شمارهٔ ایستگاه روی پلاکِ بالای دیوارِ شمالی است)','وقتی سیگنال قفل شد، کدِ هوایی روی نمایشگر می‌آید.']});
function onSlot(){if(S.lockerOpen)return;if(pslots.every(s=>s.occ&&s.occ.rank===s.idx)){S.lockerOpen=true;chime();pslots.forEach(s=>s.mesh.material.emissive.setHex(0x0b4a22));play('metalLatch');tween(.9,e=>{ldoor.rotation.y=-1.6*e});toast('ترتیب درست بود؛ قفسهٔ کنار در باز شد.',5000)}}
// رادیو
const mon=monitorObj('mon',{pos:[-1.6,1.8,-12.9],rotY:0,w:.9,h:.5,lines:[{t:'گیرندهٔ امداد',size:40},{t:'فرکانس را تنظیم کن',size:28,color:'#ffcf7a'}]});
function radioUpd(v){const d=Math.abs(v-CODE.F),pct=Math.max(0,100-d*25);
 if(d===0){S.codeShown=true;mon.draw([{t:'سیگنال قفل شد!',size:40,color:'#7dffa0'},{t:'کد هوایی:',size:30,color:'#ffcf7a'},{t:fa(CODE.air),size:80,color:'#ffffff'}]);chime();for(let i=0;i<6;i++)tn(880,.18,.1,'square',null,null,i*.28)}
 else mon.draw([{t:'گیرندهٔ امداد',size:36},{t:'فرکانس: '+fa(v),size:34},{t:'سیگنال: '+fa(pct)+'٪',size:44,color:pct>60?'#ffcf7a':'#ff7a7a'}]);
 if(d>0)nb(.25,2000-d*40,500,Math.max(.03,.2-d*.02),'bandpass')}
const rad=stepper('rad',{pos:[-1.6,1.25,-12.9],rotY:0,label:'فرکانس',min:70,max:100,step:1,val:70,onChange:radioUpd});
const KP=makeKeypad('kp3',4,CODE.air,new V3(4.45,1.3,-7.4),-Math.PI/2,()=>{S.airOpen=true;S.exitOpen=true;door3.openIt();Lcap.intensity=1.4;toast('قفل هوایی باز شد؛ به کپسول نجات برو.',5000)},'قفل هوایی');
decor('field-console-a92adc',{x:-2.2,z:-12.3,h:1.0,w:1.2,d:.6,col:0x2a3440,solid:true});
decor('comms-dish-7b129a',{x:3.4,z:-12.2,h:1.2,w:.8,d:.8,col:0xcccccc,solid:true});
decor('../_shared/models/astronaut.glb',{x:3.2,z:-6.0,h:1.8,w:.6,d:.5,col:0xdddddd,solid:true,ry:2.6});
decor('airlock-end-cap-acee1d',{x:6.5,z:-9.1,h:2.2,w:.3,d:2,col:0x3a4350,ry:0});
/* ---- شیء سناریو ---- */
SC={id:'station',start:[0,1.0,0],endTitle:'کپسول نجات جدا شد!',endText:'زمین آرام زیر پایت می‌چرخد.',zone:[9.0,10.3,-10.0,-8.2],
 intro:'ایستگاه تاریک است و چراغ اضطراریِ قرمز می‌زند. یادداشتی روی زمین افتاده…',
 room:()=>{const p=camera.getWorldPosition(new V3());return p.x>4.6?'air':p.z<-5.1?'control':'cabin'},rain:()=>0,
 omens:r=>['flick','step','whisper','creak','heart','knock'],
 hint(){const L=!S.power?['یادداشت را بخوان: کلیدهای برق به ترتیبِ وابستگی وصل می‌شوند.','اول ژنراتور، بعد باتری، بعد شبکه، آخر فشار.']
  :!S.lockerOpen?['سیاره‌ها روی میزِ وسط اتاق‌اند؛ روی قفسهٔ غربی از نزدیک‌ترین تا دورترین به خورشید بچین.','ترتیب: عطارد، زهره، زمین، مریخ، مشتری، زحل (نه اندازه، بلکه فاصله).']
  :!S.codeShown?['یادداشت داخل قفسه را بخوان: فرکانس = شمارهٔ ایستگاه × ۲ + ۳. شمارهٔ ایستگاه روی پلاک بالای دیوار شمالی است.']
  :['کدِ نمایشگر را روی قفلِ هوایی (دیوار شرقی) بزن.'];return L[Math.min(L.length-1,S.hintN++%L.length)]},
 onSlot,
 update(dt,now){halo.material.opacity=.25+.2*Math.sin(now*3);if(!S.power){const f=lightFlick>0?(Math.random()>.45?1:.1):1;Lq.intensity=1.6*f*(.8+.2*Math.sin(now*3))}else if(lightFlick>0){Lq.intensity=Math.random()>.45?2:.2}else Lq.intensity=2;
  if(S.exitOpen)dawn.material.color.lerp(new THREE.Color(0x3a7ac0),.01)}};
Object.assign(RVR,{CODE,key(id,code){for(const ch of code)KP.press(ch)},powerOrder(){[0,1,2,3].forEach(i=>RVR.use('pw'+i))},setFreq(v){for(let i=70;i<v;i++)RVR.use('rad-up')}});
})();
