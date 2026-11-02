(function(){S.calPage=1;
const Llobby=plight(0xffc98f,1.6,13,0,2.7,-1.2),Lhall=plight(0xffb985,0,22,0,4.6,-12.5),Lscreen=plight(0xaec8ff,0,16,0,2.8,-17.6),Lbooth=plight(0xffd9a0,2.0,10,7.6,2.6,-9),Lexit=plight(0xcfe3ff,0,8,0,1.8,-22);
const doorL=makeDoor('doorL',-.8,-6.1,1.6,2.3,'x',Math.PI/2);
const doorB=makeDoor('doorB',5.6,-8.7,1.4,2.2,'z',Math.PI/2);
/* ---- کدها */
const CODE={row:ri(2,9),seat:ri(1,9),hour:ri(18,23),day:ri(13,28)};
CODE.lobby=''+CODE.row+CODE.seat+CODE.hour;CODE.startDay=CODE.day-10;CODE.hall=pad2(CODE.startDay)+'08'+'05';CODE.planet=''+ri(1,9)+ri(1,9)+ri(1,9)+ri(1,9);

/* --- سرسرا --- */
bx(8.4,.1,8.4,M.carpet,0,-.05,-2,world,.9);bx(8.4,.1,8.4,M.ceil,0,3.25,-2);
/* --- سالن --- */
bx(11.4,.1,14.4,M.carpetH,0,-.05,-13.1,world,.9);bx(11.4,.1,14.4,M.ceil,0,5.55,-13.1);
/* --- اتاق آپارات --- */
bx(4.2,.1,5.4,M.conc,7.6,-.05,-8.9,world,.8);bx(4.2,.1,5.4,M.ceil,7.6,3.25,-8.9);
/* --- راهرو خروج --- */
bx(2.6,.1,3.6,M.conc,0,-.05,-21.9,world,.8);bx(2.6,.1,3.6,M.ceil,0,2.85,-21.9);
wall('z',-4.1,-6.2,2.2,3.2,[],M.wall);wall('z',4.1,-6.2,2.2,3.2,[],M.wall);wall('x',2.1,-4.2,4.2,3.2,[],M.wall);
wall('x',-6.1,-5.7,5.7,5.5,[{a0:-.8,a1:.8,y0:0,y1:2.3}],M.wall);
wall('z',-5.6,-20.2,-6.0,5.5,[],M.wall);
wall('z',5.6,-20.2,-6.0,5.5,[{a0:-8.7,a1:-7.3,y0:0,y1:2.2},{a0:-10.4,a1:-9.6,y0:1.2,y1:1.9}],M.wall);
wall('x',-20.1,-5.7,5.7,5.5,[{a0:-.8,a1:.8,y0:0,y1:2.4}],M.wall);
wall('z',9.6,-11.6,-6.2,3.2,[],M.conc);wall('x',-11.5,5.5,9.7,3.2,[],M.conc);wall('x',-6.3,5.5,9.7,3.2,[],M.conc);
wall('z',-1.3,-23.7,-20.0,2.8,[],M.conc);wall('z',1.3,-23.7,-20.0,2.8,[],M.conc);
const dawn=bx(2.6,2.8,.05,new THREE.MeshBasicMaterial({color:0xdce9ff}),0,1.4,-23.65);
/* پانل‌های چوبی پایین دیوار سرسرا */
for(const [x,z,w,d] of [[-4.0,-2,.08,8.4],[4.0,-2,.08,8.4]])bx(w,1.0,d,M.woodD,x,.5,z);bx(8,1.0,.08,M.woodD,0,.5,2.0);bx(3.4,1.0,.08,M.woodD,-2.3,.5,-6.0);bx(3.4,1.0,.08,M.woodD,2.3,.5,-6.0);

/* --- شیشهٔ ورودی (قفل) --- */
const glassM=new THREE.MeshBasicMaterial({color:0x0a1626});const glass=new THREE.Mesh(new THREE.PlaneGeometry(3.4,2.5),glassM);glass.position.set(0,1.3,2.0);glass.rotation.y=Math.PI;world.add(glass);
bx(3.6,.1,.1,M.dark,0,2.6,2.02);bx(.06,2.5,.06,M.dark,0,1.3,2.0);bx(.4,.06,.04,M.gold,0,1.1,1.97);
(()=>{const c=cv(512,128),g=c.getContext('2d');g.fillStyle='#14080a';g.fillRect(0,0,512,128);g.strokeStyle='#a33';g.lineWidth=4;g.strokeRect(6,6,500,116);putText(g,'درِ ورودی قفل است',256,34,480,52,'#e66',60,{weight:'bold'});
 const m=new THREE.Mesh(new THREE.PlaneGeometry(.7,.17),new THREE.MeshBasicMaterial({map:ctex(c)}));m.position.set(0,1.75,1.96);m.rotation.y=Math.PI;world.add(m)})();

/* --- باجه و کشو --- */
furn(.7,1.0,2.6,M.wood,3.4,.5,-2.0,true);furn(.82,.06,2.76,M.woodD,3.4,1.03,-2.0,false);
const drawer=new THREE.Group();drawer.position.set(3.05,0,-2.0);world.add(drawer);
bx(.04,.28,.5,M.woodD,0,.72,0,drawer);bx(.45,.03,.46,M.wood,.24,.6,0,drawer);bx(.45,.12,.02,M.wood,.24,.66,.23,drawer);bx(.45,.12,.02,M.wood,.24,.66,-.23,drawer);bx(.02,.12,.46,M.wood,.46,.66,0,drawer);bx(.03,.03,.16,M.gold,-.04,.72,0,drawer);
{const dm=bx(.04,.28,.5,M.woodD,0,.72,0,drawer);dm.visible=false}
mkObj('drawer',drawer,{kind:'press',label:()=>S.drawer?'بستن کشو':'کشوی باجه',use(){toggleDrawer()}});
function toggleDrawer(){S.drawer=!S.drawer;play('creak2',{v:.7,r:S.drawer?1:.85,pos:drawer.getWorldPosition(new V3())});const a=drawer.position.x,b=S.drawer?2.65:3.05;tween(.7,e=>{drawer.position.x=a+(b-a)*e})}
/* --- زنگ راهنما --- */
const bell=new THREE.Group();bell.position.set(3.4,1.06,-1.3);world.add(bell);
{const b=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10,0,6.3,0,1.55),std(0xc9a24a,{metalness:.8,roughness:.3,emissive:0x221a06}));bell.add(b);bx(.16,.02,.16,M.woodD,0,0,0,bell);bx(.02,.04,.02,M.gold,0,.08,0,bell)}
mkObj('bell',bell,{kind:'press',label:'زنگِ کمک (راهنمایی)',use(){bellRing(bell.getWorldPosition(new V3()));giveHint()}});
/* --- بلیط --- */
function ticketTex(){const c=cv(512,256),g=c.getContext('2d');g.fillStyle='#e9d9a8';g.fillRect(0,0,512,256);g.strokeStyle='#8a6a2a';g.lineWidth=4;g.setLineDash([10,8]);g.strokeRect(10,10,492,236);g.setLineDash([]);
 g.fillStyle='rgba(120,80,20,.12)';for(let i=0;i<40;i++)g.fillRect(Math.random()*512,Math.random()*256,30,3);
 putText(g,'سینما ستاره — سالن ۱',256,22,460,34,'#5a1a1a',40,{weight:'bold'});
 putText(g,'ردیف '+fa(CODE.row)+'   ·   صندلی '+fa(CODE.seat),256,92,460,50,'#201005',56,{weight:'bold'});
 putText(g,'«آخرین نمایش» — ورود تا نیمه‌شب',256,176,460,26,'#6a4a1a',30);return ctex(c)}
const ticket=new THREE.Group();{const m=new THREE.Mesh(new THREE.PlaneGeometry(.15,.075),new THREE.MeshStandardMaterial({map:ticketTex(),roughness:.9,side:THREE.DoubleSide,emissive:0x2a2418,emissiveMap:null}));ticket.add(m)}
ticket.rotation.x=-Math.PI/2;ticket.position.set(.24,.63,.0);drawer.add(ticket);
mkObj('ticket',ticket,{kind:'grab',flat:true,restH:.004,readScale:3.2,enabled:()=>S.drawer||(objs.ticket&&objs.ticket.out),label:'بلیط'});
/* --- تابلوی برنامه --- */
{const c=cv(640,440),g=c.getContext('2d');g.fillStyle='#120a0b';g.fillRect(0,0,640,440);g.strokeStyle='#b8924a';g.lineWidth=6;g.strokeRect(8,8,624,424);
 putText(g,'برنامهٔ نمایش امشب',320,24,560,44,'#ffd9a0',50,{weight:'bold'});
 const films=[['سفر به ماه',pad2(ri(16,17))+':'+pick(['00','15','45'])],['باغ خاموش',pad2(ri(19,20))+':'+pick(['10','20','50'])],['آخرین نمایش',CODE.hour+':'+pick(['00','30','45'])],['شب‌های بی‌پایان',pad2(ri(0,1))+':'+pick(['05','40'])]];
 // ترتیب ثابت: سومین ردیف همان «آخرین نمایش»
 films.forEach((f,i)=>{const y=100+i*78;g.fillStyle=i===2?'#2a1618':'#1a1012';g.fillRect(24,y,592,64);putText(g,f[0],590,y+10,320,38,i===2?'#fff':'#c8bba5',44,{align:'right'});putText(g,fa(f[1]),70,y+10,200,40,'#ffcf7a',44,{align:'left',weight:'bold'})});
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.9),new THREE.MeshStandardMaterial({map:ctex(c),emissive:0x884433,emissiveMap:ctex(c),emissiveIntensity:.35}));m.position.set(-3.98,1.75,-2.6);m.rotation.y=Math.PI/2;world.add(m);bx(.03,1.0,1.4,M.gold,-4.01,1.75,-2.6)}
/* --- کاغذ روی زمین --- */
function noteTex(){const c=cv(620,880),g=c.getContext('2d');g.fillStyle='#e8dcb8';g.fillRect(0,0,620,880);
 for(let i=0;i<260;i++){g.fillStyle='rgba(90,60,20,'+Math.random()*.07+')';g.beginPath();g.arc(Math.random()*620,Math.random()*880,Math.random()*30,0,7);g.fill()}
 g.fillStyle='rgba(120,70,30,.22)';g.beginPath();g.arc(470,700,70,0,7);g.fill();
 let y=46;const ink='#2a1d12';
 y=putText(g,'هر که این‌جا ماند، دیگر برنگشت…',310,y,540,36,'#6b1b1b',54,{weight:'bold'});y+=8;
 y=putText(g,'اگر می‌خواهی از این سرسرا بگذری، دو چیز را پیدا کن:',560,y,540,32,ink,50,{align:'right'});y+=6;
 y=putText(g,'۱) بلیطی که در کشوی باجه خوابیده؛ جایت را می‌گوید (اول ردیف، بعد صندلی).',560,y,540,32,ink,50,{align:'right'});y+=6;
 y=putText(g,'۲) «آخرین نمایش» ساعتی دارد؛ روی تابلوی برنامه بخوانش (فقط ساعت، دو رقم).',560,y,540,32,ink,50,{align:'right'});y+=14;
 y=putText(g,'این چهار رقم را پشت سر هم روی قفلِ درِ سالن بزن.',560,y,540,32,ink,50,{align:'right',weight:'bold'});
 putText(g,'— متصدی شب',120,820,200,28,'#5a4630',34,{align:'center'});return ctex(c)}
const note=new THREE.Group();{const m=new THREE.Mesh(new THREE.PlaneGeometry(.21,.297),new THREE.MeshStandardMaterial({map:noteTex(),roughness:.95,side:THREE.DoubleSide,emissive:0x2a2418}));note.add(m)}
note.rotation.set(-Math.PI/2,0,.5,'YXZ');note.position.set(-1.0,.006,-2.2);world.add(note);
mkObj('note',note,{kind:'grab',flat:true,restH:.004,readScale:2.0,label:'کاغذِ افتاده روی زمین',onGrab(){halo.visible=false}});
const halo=new THREE.Mesh(new THREE.RingGeometry(.2,.26,40),new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.set(-1.0,.012,-2.2);world.add(halo);
/* --- دکور سرسرا --- */
{const pm=bx(.8,1.7,.7,std(0x9a1b1b,{emissive:0x300808}),-3.3,.85,-5.2);occ.push(pm);blk(-3.75,-5.55,-2.85,-4.85);bx(.7,.8,.6,std(0xe7c25a,{emissive:0x4a3808,transparent:true,opacity:.85}),-3.3,1.5,-5.2);bx(.9,.12,.8,M.gold,-3.3,1.74,-5.2);
 const bench=furn(.5,.45,2.2,M.velvet,-3.6,.23,1.0,true);furn(.1,.5,2.2,M.velvet,-3.82,.7,1.0,false);
 // مقوای سینمایی (آدمک مقوایی)
 const st=new THREE.Group();const sc=cv(256,512),sg=sc.getContext('2d');sg.fillStyle='#10131a';sg.beginPath();sg.arc(128,70,50,0,7);sg.fill();sg.beginPath();sg.moveTo(40,500);sg.lineTo(60,150);sg.quadraticCurveTo(128,110,196,150);sg.lineTo(216,500);sg.closePath();sg.fill();sg.fillStyle='#b8924a';sg.fillRect(86,300,84,12);
 const sm=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.4),new THREE.MeshStandardMaterial({map:ctex(sc),transparent:true,side:THREE.DoubleSide}));sm.position.y=.72;st.add(sm);st.position.set(2.1,0,-5.3);st.rotation.y=-.35;world.add(st);
 for(const x of [-2.5,0,2.5]){const pc=cv(256,360),pg=pc.getContext('2d');const gr=pg.createLinearGradient(0,0,0,360);gr.addColorStop(0,pick(['#40201f','#1f2f40','#2c3a22']));gr.addColorStop(1,'#050505');pg.fillStyle=gr;pg.fillRect(0,0,256,360);pg.strokeStyle='#b8924a';pg.lineWidth=6;pg.strokeRect(6,6,244,348);putText(pg,pick(['شب‌های بی‌پایان','باغ خاموش','سفر به ماه']),128,230,220,34,'#ffd9a0',42,{weight:'bold'});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.0),new THREE.MeshStandardMaterial({map:ctex(pc),emissive:0x221111}));m.position.set(x,1.9,1.99);m.rotation.y=Math.PI;world.add(m)}}

/* ---- کی‌پدها ---- */
const KP1=makeKeypad('kp1',4,CODE.lobby,new V3(1.4,1.3,-5.98),0,()=>{S.lobbyOk=true;doorL.openIt();setTimeout(openHall,900)},'قفل درِ سالن');
const KP2=makeKeypad('kp2',6,CODE.hall,new V3(5.46,1.3,-6.9),-Math.PI/2,()=>{S.boothOpen=true;doorB.openIt();setTimeout(()=>toast('درِ آپارات باز شد.',4000),600)},'قفل آپارات (روز ماه سال)');

/* ============================================================ سالن */
const seatCnt=2*4*7,seatC=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.12,.5),M.velvet,seatCnt),seatB=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.62,.1),M.velvet,seatCnt),seatP=new THREE.InstancedMesh(new THREE.BoxGeometry(.36,.4,.36),M.dark,seatCnt);
const seatSpots=[];{let i=0;const mt=new THREE.Matrix4();for(let r=0;r<7;r++){const z=-9.6-r*1.05;for(const sgn of [-1,1])for(let c=0;c<4;c++){const x=sgn*(1.4+c*.55);
 mt.makeTranslation(x,.42,z);seatC.setMatrixAt(i,mt);mt.makeTranslation(x,.78,z+.2);seatB.setMatrixAt(i,mt);mt.makeTranslation(x,.2,z);seatP.setMatrixAt(i,mt);seatSpots.push(new V3(x,0,z));i++}}
 for(let r=0;r<7;r++){const z=-9.6-r*1.05;blk(-3.35,z-.3,-1.1,z+.3);blk(1.1,z-.3,3.35,z+.3)}}
world.add(seatC,seatB,seatP);
/* پرده */
const scr={cv:cv(1024,430),mode:'off',t:0,acc:0},scrCtx=scr.cv.getContext('2d'),scrTex=ctex(scr.cv);
const screenG=new THREE.Group();screenG.position.set(0,2.6,0);world.add(screenG);
bx(8.5,3.9,.1,M.black,0,0,-19.85,screenG);
const screenM=new THREE.Mesh(new THREE.PlaneGeometry(8,3.35),new THREE.MeshBasicMaterial({map:scrTex}));screenM.position.set(0,0,-19.78);screenG.add(screenM);
mkObj('screen',screenG,{kind:'press',label:'پخش دوبارهٔ معما',use(){if(S.hallOpen&&!S.projOn){scr.t=0;play('switch24',{v:.5})}}});
bx(9,.35,.5,M.woodD,0,.17,-19.6);
/* نشان «خروج» پشت پرده */
bx(1.3,.34,.06,new THREE.MeshBasicMaterial({color:0x22ff77}),0,2.75,-19.98);
/* پرتو پروژکتور */
const projPos=new V3(5.6,1.55,-10),scrC=new V3(0,2.6,-19.7);
const beam=(()=>{const L=projPos.distanceTo(scrC);const geo=new THREE.CylinderGeometry(2.4,.04,L,24,1,true);const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xcfdfff,transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
 m.position.copy(projPos).add(scrC).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new V3(0,1,0),scrC.clone().sub(projPos).normalize());m.visible=false;scene.add(m);return m})();
const dust=(()=>{const n=140,pos=new Float32Array(n*3),sd=[];for(let i=0;i<n;i++){const t=Math.random(),r=Math.random()*(.05+2.2*t)*.9,a=Math.random()*6.28;sd.push({t,r,a,sp:.02+Math.random()*.05});}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));const p=new THREE.Points(geo,new THREE.PointsMaterial({color:0xdfe8ff,size:.025,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending}));p.frustumCulled=false;p.visible=false;scene.add(p);return {p,sd,pos,geo}})();
const dir=scrC.clone().sub(projPos),dirN=dir.clone().normalize(),side=new V3().crossVectors(dirN,new V3(0,1,0)).normalize(),upv=new V3().crossVectors(side,dirN).normalize();
function updDust(dt){const {sd,pos,geo}=dust;for(let i=0;i<sd.length;i++){const s=sd[i];s.t+=s.sp*dt;if(s.t>1)s.t-=1;s.a+=dt*.2;const r=s.r*(.05+2.2*s.t)/(.05+2.2*.5);
 pos[i*3]=projPos.x+dir.x*s.t+side.x*Math.cos(s.a)*r+upv.x*Math.sin(s.a)*r;pos[i*3+1]=projPos.y+dir.y*s.t+side.y*Math.cos(s.a)*r+upv.y*Math.sin(s.a)*r;pos[i*3+2]=projPos.z+dir.z*s.t+side.z*Math.cos(s.a)*r+upv.z*Math.sin(s.a)*r}geo.attributes.position.needsUpdate=true}
/* تقویم */
const MONTHS=[{n:'آبان',start:6,len:30},{n:'آذر',start:1,len:30},{n:'دی',start:3,len:30}];
const calC=cv(512,720),calG=calC.getContext('2d'),calT=ctex(calC);
function drawCal(){const g=calG,m=MONTHS[S.calPage];g.fillStyle='#efe6cf';g.fillRect(0,0,512,720);g.fillStyle='#7a1d1d';g.fillRect(0,0,512,120);
 g.fillStyle='#222';for(let i=0;i<8;i++){g.beginPath();g.arc(40+i*62,16,8,0,7);g.fill()}
 putText(g,m.n,256,26,400,64,'#fff',70,{weight:'bold'});putText(g,fa(1405),256,92,200,26,'#ffd9a0',30);
 const cw=64,x0=512-32-cw/2,days='شیدسچپج';for(let c=0;c<7;c++)putText(g,days[c],x0-c*cw,138,60,26,c===6?'#b22':'#444',30,{weight:'bold'});
 for(let d=1;d<=m.len;d++){const idx=m.start+d-1,r=Math.floor(idx/7)+1,c=idx%7,cx=x0-c*cw,cy=170+r*78;
  putText(g,fa(d),cx,cy,60,34,c===6?'#b22':'#222',40);
  if(S.calPage===1&&d===CODE.day){g.strokeStyle='#d01818';g.lineWidth=5;g.beginPath();g.ellipse(cx,cy+22,28,30,-.15,0,7);g.stroke()}}
 putText(g,'‹ ورق بزن ›',256,676,300,22,'#8a7a5a',26);calT.needsUpdate=true}
{const cal=new THREE.Group();cal.position.set(-5.47,1.55,-8.0);cal.rotation.y=Math.PI/2;world.add(cal);
 bx(.64,.86,.02,M.woodD,0,0,-.012,cal);const cm=new THREE.Mesh(new THREE.PlaneGeometry(.56,.79),new THREE.MeshStandardMaterial({map:calT,emissive:0x443322,emissiveMap:calT,emissiveIntensity:.5}));cm.position.z=.002;cal.add(cm);
 const mkB=(txt,x,dx)=>{const c=cv(128,64),g=c.getContext('2d');g.fillStyle='#4a1d1d';g.fillRect(0,0,128,64);g.strokeStyle='#d9b270';g.lineWidth=4;g.strokeRect(2,2,124,60);putText(g,txt,64,14,120,32,'#fff',40);
  const t=ctex(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(.15,.075),new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.3}));m.position.set(x,-.5,.01);cal.add(m);return m};
 const bp=mkB('ماه قبل',.18),bn=mkB('ماه بعد',-.18);
 const flip=d=>{S.calPage=Math.max(0,Math.min(2,S.calPage+d));drawCal();play(pick(['bookFlip1','bookFlip2']),{pos:cal.getWorldPosition(new V3())})};
 mkObj('cal-prev',bp,{kind:'press',label:'ماه قبل',use(){flip(-1)}});mkObj('cal-next',bn,{kind:'press',label:'ماه بعد',use(){flip(1)}});
 mkObj('cal',cm,{kind:'press',label:'تقویم دیواری',use(){}});drawCal()}
/* چراغ‌های کنار سالن */
for(let i=0;i<5;i++)for(const sg of [-1,1]){bx(.06,.14,.2,std(0xffc27a,{emissive:0x9a6a30,emissiveIntensity:.9}),sg*5.5,1.8,-8-i*2.6)}
/* فرش چراغ‌دار راهرو */
for(let i=0;i<8;i++)for(const x of [-.95,.95])bx(.05,.01,.4,new THREE.MeshBasicMaterial({color:0x6b2a14}),x,.01,-9.2-i*1.0);
/* ============================================================ آپارات */
var projLamp;const reels=[];const proj=new THREE.Group();proj.position.set(6.2,1.0,-10.0);world.add(proj);
bx(.9,1.0,1.3,M.woodD,0,-.5,0,proj);blk(5.75,-10.65,6.65,-9.35);occ.push(proj.children[0]);surfaces.push({x0:5.75,x1:6.65,z0:-10.65,z1:-9.35,y:1.0});
{const body=bx(.7,.42,.4,M.metal,0,.22,0,proj);occ.push(body);const lens=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,.28,16),M.dark);lens.rotation.z=Math.PI/2;lens.position.set(-.45,.26,0);proj.add(lens);
 const lampM=new THREE.MeshBasicMaterial({color:0x333333});projLamp=new THREE.Mesh(new THREE.CircleGeometry(.075,16),lampM);projLamp.rotation.y=-Math.PI/2;projLamp.position.set(-.595,.26,0);proj.add(projLamp);
 for(const [x,y] of [[.0,.65],[.28,.65]]){const r=new THREE.Group();const d=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.04,24),M.metal);d.rotation.x=Math.PI/2;r.add(d);for(let k=0;k<3;k++){const s=bx(.34,.02,.05,M.dark,0,0,.03,r);s.rotation.z=k*Math.PI/3}r.position.set(x-.15,y,0);proj.add(r);reels.push(r)}}
/* نامه روی آپارات: پلاک */
{const c=cv(512,160),g=c.getContext('2d');g.fillStyle='#14100a';g.fillRect(0,0,512,160);g.strokeStyle='#d9b270';g.lineWidth=6;g.strokeRect(5,5,502,150);putText(g,'کوچک‌تر از بزرگ‌ترین',256,42,480,56,'#ffd9a0',64,{weight:'bold'});
 const t=ctex(c);const pm=new THREE.Mesh(new THREE.PlaneGeometry(.5,.16),new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.35}));pm.position.set(0,.3,.205);proj.add(pm);occ.push(pm)}
/* قفسهٔ سیاره‌ها */
const shelf=bx(2.2,.06,.4,M.wood,7.5,.97,-11.28);occ.push(shelf);bx(2.2,.5,.04,M.woodD,7.5,1.2,-11.47);
const SLOTX=i=>8.35-.32*i,PN=['عطارد','مریخ','زمین','اورانوس','زحل','مشتری'],PR=[.045,.06,.075,.1,.125,.145];
for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.012,24),std(0x1b1d22,{emissive:0x000000}));m.position.set(SLOTX(i),1.005,-11.28);world.add(m);m.userData.slot=slots[i]={grp:'p',idx:i,pos:new V3(SLOTX(i),1.0,-11.28),occ:null,mesh:m};pickL.push(m)}
plaque('کوچک',new V3(8.62,1.45,-11.43),0,.28,.12,'#7dd8ff');plaque('بزرگ',new V3(6.38,1.45,-11.43),0,.28,.12,'#7dd8ff');
bx(.02,.02,.02,M.black,0,0,0);
/* میز و چراغ اتاق */
{const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:0xffe3a8}));bulb.position.set(7.6,2.75,-9);world.add(bulb);bx(.01,.3,.01,M.dark,7.6,2.95,-9);
 furn(.8,.8,.5,M.woodD,9.1,.4,-6.9,true);furn(1.1,.5,.6,M.metal,9.0,.25,-10.9,true)}
{const can=std(0x7a7f86,{metalness:.6,roughness:.4});for(let i=0;i<5;i++){const cn=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.07,20),can);cn.position.set(9.0,1.35+i*.075+.03,-10.9);world.add(cn)}
 for(let i=0;i<3;i++){const cn=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.07,20),can);cn.position.set(9.2,.04+i*.075,-8.2);world.add(cn)}
 const ch=bx(.5,.06,.5,M.woodD,8.9,.5,-8.9);occ.push(ch);bx(.5,.5,.06,M.woodD,8.9,.78,-9.15);for(const [dx,dz] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]])bx(.04,.5,.04,M.dark,8.9+dx,.25,-8.9+dz);
 const pc=cv(256,360),pg=pc.getContext('2d');pg.fillStyle='#d8cdb0';pg.fillRect(0,0,256,360);pg.strokeStyle='#8a1c1c';pg.lineWidth=10;pg.strokeRect(10,10,236,340);putText(pg,'خطر\nبرق فشار قوی\nلطفاً دست نزنید',128,60,220,40,'#8a1c1c',54,{weight:'bold'});
 const pm=new THREE.Mesh(new THREE.PlaneGeometry(.45,.63),new THREE.MeshStandardMaterial({map:ctex(pc),emissive:0x222018}));pm.position.set(9.58,1.6,-8.6);pm.rotation.y=-Math.PI/2;world.add(pm);
 for(let i=0;i<4;i++){const cb=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,2.5,6),M.black);cb.rotation.z=Math.PI/2+i*.05;cb.position.set(7.0,.02,-9.9+i*.07);world.add(cb)}}
const kp3pos=new V3(7.0,1.3,-6.43);
const KP3=makeKeypad('kp3',4,CODE.planet,kp3pos,Math.PI,()=>startFinale(),'آپارات — کد فیلم');
/* ---- سیاره‌ها ---- */
function bandTex(cols,seed,kind){const r=rngF(seed),c=cv(512,256),g=c.getContext('2d');
 if(kind==='bands'){const n=14;for(let i=0;i<n;i++){g.fillStyle=cols[Math.floor(r()*cols.length)];g.fillRect(0,i*256/n,512,256/n+2)}for(let i=0;i<60;i++){g.fillStyle='rgba(255,255,255,'+r()*.08+')';g.fillRect(r()*512,r()*256,r()*160,3)}}
 else{g.fillStyle=cols[0];g.fillRect(0,0,512,256);for(let i=0;i<(kind==='crater'?90:40);i++){g.fillStyle=kind==='crater'?'rgba(40,36,34,'+(.15+r()*.3)+')':'rgba('+(120+r()*60|0)+',50,30,'+(.15+r()*.25)+')';g.beginPath();g.arc(r()*512,r()*256,4+r()*(kind==='crater'?14:26),0,7);g.fill()}}return c}
const earthTex=new THREE.TextureLoader().load('../_shared/earth.jpg'+VER);
const planets=[];
function makePlanet(i,x,z){
 const R=PR[i],g=new THREE.Group();let map;
 if(i===0)map=ctex(bandTex(['#8a817a'],7,'crater'));else if(i===1)map=ctex(bandTex(['#b5502d'],3,'blotch'));else if(i===2)map=earthTex;else if(i===3)map=ctex(bandTex(['#8fe0e8','#9fe8ee'],5,'bands'));else if(i===4)map=ctex(bandTex(['#d9c08a','#c8a96a','#e6d4a2','#b99a5a'],9,'bands'));else map=ctex(bandTex(['#d9a066','#b9763c','#e8c9a0','#9c5f2c','#c98d52'],11,'bands'));
 const sph=new THREE.Mesh(new THREE.SphereGeometry(R,32,20),new THREE.MeshStandardMaterial({map,roughness:.7,emissive:0x0a0a0a}));g.add(sph);
 let ringRoot=null;if(i===4){const rg=new THREE.Mesh(new THREE.RingGeometry(R*1.35,R*2.05,48),new THREE.MeshStandardMaterial({color:0xcdb88a,side:THREE.DoubleSide,transparent:true,opacity:.8,roughness:.8}));rg.rotation.x=Math.PI/2-.35;g.add(rg)}
 g.position.set(x,R,z);world.add(g);
 const o=mkObj('p'+i,g,{kind:'grab',rank:i,restH:R,slotable:true,label:PN[i],sph});planets.push(o);
 o.use=()=>planetPress(o);return o}
{const spots=[[7.2,-8.2],[8.3,-8.6],[8.9,-9.7],[7.7,-9.3],[6.9,-7.6],[8.2,-7.4]],ord=[0,1,2,3,4,5].sort(()=>rnd()-.5);ord.forEach((pi,k)=>makePlanet(pi,spots[k][0],spots[k][1]))}
function checkShelf(){if(S.shelfOk)return;if(slots.every(s=>s.occ&&s.occ.rank===s.idx)){S.shelfOk=true;planets.forEach(p=>{p.locked=true});chime();for(const s of slots)s.mesh.material.emissive.setHex(0x0b4a22);toast('هر شش سیاره سر جای خودشان نشستند. صدای ماشین آپارات عوض شد…',6500);projSpeed(1.3);tension(.1)}}
function planetPress(o){
 if(!S.shelfOk)return;if(o.flipped)return;
 if(o.rank===4){o.flipped=true;drawSaturnCode(o);play('bookFlip1',{v:1,pos:o.g.getWorldPosition(new V3())});tween(1.4,e=>{o.g.rotation.y=Math.PI*ease(e)});setTimeout(()=>toast('پشت زحل چهار رقم حک شده. کد آپارات را روی کی‌پدِ دیوار بزن.',7000),1500)}
 else{S.wrong++;S.tension=Math.min(1,S.tension+.1);play('creak3',{v:.8,r:.8,pos:o.g.getWorldPosition(new V3())});buzz();const b=o.g.position.y;tween(.4,e=>{o.g.position.y=b+Math.sin(e*18)*.01*(1-e)});toast('نه… این نیست. «کوچک‌تر از بزرگ‌ترین» کدام است؟',4000)}}
function drawSaturnCode(o){const m=o.sph.material.map;const c=m.image,g=c.getContext('2d');g.fillStyle='rgba(30,20,10,.92)';rr(g,330,70,180,120,18);g.fill();g.strokeStyle='#ffd9a0';g.lineWidth=3;rr(g,330,70,180,120,18);g.stroke();
 g.direction='ltr';g.textAlign='center';g.textBaseline='middle';g.font='bold 56px '+FONT;g.fillStyle='#ffe9b8';g.fillText(fa(CODE.planet),420,132);m.needsUpdate=true}

/* ============================================================ منطق مراحل */
function openHall(){
 if(S.hallOpen)return;S.hallOpen=true;scr.mode='riddle';scr.t=0;beam.visible=true;dust.p.visible=true;projStart(projPos);
 const a=Lhall.intensity;tween(4,e=>{Lhall.intensity=.9*e;Lscreen.intensity=.7*e;beam.material.opacity=.05*e});
 setTimeout(()=>toast('سالن روشن شد. پرده چیزی می‌گوید…',5000),1200);
 SHADOW.spawn=true}
function startFinale(){
 if(S.projOn)return;S.projOn=true;scr.mode='finale';scr.t=0;projSpeed(1.8);heart(5);
 projLamp.material.color.setHex(0xfff4d0);
 setTimeout(()=>{stinger();Llobby.intensity=0;Lhall.intensity=0},4800);
 setTimeout(()=>{toast('پرده بالا می‌رود…',3500);play('creak1',{v:.8,r:.5});nb(3.2,120,40,.5,'lowpass');const y0=screenG.position.y;tween(3.4,e=>{screenG.position.y=y0+2.6*ease(e)});Lexit.intensity=1.1;Lhall.intensity=.5;scr.mode='off'},7200);
 setTimeout(()=>{S.exitOpen=true;toast('پشتِ پرده راه خروج است.',5500)},10800)}
const SHADOW={g:null,spawn:false,vis:false,look:0,until:0};
{const g=new THREE.Group();const mt=M.black;const torso=new THREE.Mesh(new THREE.BoxGeometry(.42,.6,.25),mt);torso.position.y=.82;const head=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),mt);head.position.y=1.28;const lg=new THREE.Mesh(new THREE.BoxGeometry(.4,.14,.5),mt);lg.position.set(0,.45,.15);g.add(torso,head,lg);g.visible=false;world.add(g);SHADOW.g=g}
function room(){const p=camera.getWorldPosition(new V3());if(p.x>5.6)return'booth';if(p.z<-6.2)return'hall';return'lobby'}
function showShadow(){const p=camera.getWorldPosition(new V3());const c=seatSpots.filter(s=>s.distanceTo(p)>3&&s.distanceTo(p)<9);if(!c.length)return;const s=pick(c);SHADOW.g.position.set(s.x,0,s.z);SHADOW.g.lookAt(p.x,0,p.z);SHADOW.g.visible=true;SHADOW.vis=true;SHADOW.look=0;SHADOW.until=NOW()+14;lightFlick=1;play('creak3',{v:.7,r:.5,pos:new V3(s.x,1,s.z)})}
function hideShadow(){SHADOW.g.visible=false;SHADOW.vis=false;heart(1)}
/* ---- راهنما ---- */
function sHint(){
 let L;if(!S.lobbyOk)L=['کاغذی روی زمین افتاده؛ بردار و نزدیک چشمت بیاور.','بلیط توی کشوی باجه است. تابلوی برنامه هم روی دیوار غربی است.','کد = ردیف + صندلی (روی بلیط) + ساعتِ «آخرین نمایش» (روی تابلو).'];
 else if(!S.boothOpen)L=['معما روی پرده پخش می‌شود؛ برای تکرار، پرده را لمس کن.','روی تقویم دیوار با «ماه قبل/بعد» ورق بزن. روز دایره‌شده در آذر است.','چهل روز عقب برو: آذر ۳۰ روز دارد. کد = روز، ماه، سال دو رقمی (هر کدام دو رقم).'];
 else if(!S.shelfOk)L=['سیاره‌ها روی زمین‌اند؛ روی قفسهٔ آپارات جای آن‌ها هست.','سمت «کوچک» را از راست شروع کن؛ بزرگ‌ترین سمت چپ.','فقط ترتیب اندازه مهم است: عطارد، مریخ، زمین، اورانوس، زحل، مشتری.'];
 else if(!S.projOn)L=['«کوچک‌تر از بزرگ‌ترین» یعنی دومین سیارهٔ بزرگ. آن را لمس کن.','زحل را بچرخان؛ پشتش چهار رقم است. کد را روی کی‌پدِ دیوارِ آپارات بزن.'];
 else L=['پرده را نگاه کن؛ راه خروج پشت آن است.'];
 const t=L[Math.min(L.length-1,S.hintN=(S.hintN||0)%L.length)];S.hintN++;return t}
/* ---- نقاشی پرده ---- */
const RID=['آخرین نمایش','چهل روز پیش از روزی که روی تقویمِ دیوار دایره شده،','نخستین قابِ این فیلم ثبت شد.','آن روز را پیدا کن:\nروز · ماه · سال (دو رقمی)','هر بخش دو رقم است؛ مثلاً ۰۳ ۰۷ ۹۹ می‌شود ۰۳۰۷۹۹'];
function drawScreen(){
 const g=scrCtx,W=1024,H=430,t=scr.t;g.fillStyle='#07090d';g.fillRect(0,0,W,H);
 if(scr.mode==='riddle'){
  const per=4.6,total=per*(RID.length+1),tt=t%total,pg=Math.floor(tt/per),ph=(tt%per)/per;
  const a=Math.min(1,ph*4,(1-ph)*4);
  if(pg<RID.length){g.globalAlpha=a;const big=pg===0;g.save();g.shadowColor='#bcd8ff';g.shadowBlur=18;putText(g,RID[pg],W/2,big?150:H/2-70,860,big?92:54,big?'#ffe3a8':'#eaf2ff',big?100:76,{weight:'bold'});g.restore();g.globalAlpha=1}
 }else if(scr.mode==='finale'){
  const k=Math.min(1,t/6);g.fillStyle='#d8dde6';g.fillRect(0,0,W,H);g.fillStyle='#0a0a0c';const s=.7+.9*k;g.beginPath();g.ellipse(W/2,H*.82,230*s,260*s,0,Math.PI,0);g.fill();g.beginPath();g.arc(W/2,H*.45-30*k,70*s,0,7);g.fill();
  if(t>5)putText(g,'پایان',W/2,60,400,100,'#fff',100,{weight:'bold'})}
 // دانه و خط‌خطی فیلم
 for(let i=0;i<70;i++){g.fillStyle='rgba(255,255,255,'+Math.random()*.12+')';g.fillRect(Math.random()*W,Math.random()*H,1+Math.random()*3,1+Math.random()*3)}
 g.fillStyle='rgba(255,255,255,.1)';g.fillRect(Math.random()*W,0,1,H);if(Math.random()<.08){g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,0,W,H)}
 const v=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.6);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.65)');g.fillStyle=v;g.fillRect(0,0,W,H);
 scrTex.needsUpdate=true;Lscreen.intensity=S.hallOpen?(scr.mode==='finale'?1.3:.7)*(.85+.15*Math.random()):0}
scr.mode='off';drawScreen0();function drawScreen0(){scrCtx.fillStyle='#050608';scrCtx.fillRect(0,0,1024,430);scrTex.needsUpdate=true}

plaque('ورودی سالن ۱',new V3(0,2.55,-6.0),0,.9,.22,'#ffcf7a');plaque('اتاق آپارات — ورود ممنوع',new V3(5.49,2.45,-8.0),-Math.PI/2,.9,.22,'#ff7a7a');
SC={id:'cinema',start:[0,.8,0],endTitle:'از سینما بیرون آمدی!',endText:'باران بند آمده و آسمان دارد روشن می‌شود.',
 intro:'نیمه‌شب است و تو در این سینما گیر افتاده‌ای. دنبال هر چیزی بگرد که روی زمین افتاده…',
 room,rain:r=>r==='lobby'?.045:.012,
 omens:r=>({lobby:['flick','thunder','step','whisper','creak'],hall:['flick','step','whisper','shadow','shadow','heart','creak'],booth:['flick','knock','whisper','heart']})[r]||['flick'],
 omen(k){if(k==='shadow'&&S.hallOpen&&!S.projOn)showShadow()},
 onThunder(){glassM.color.setHex(0x9fb8e0);setTimeout(()=>glassM.color.setHex(0x0a1626),180)},
 onSlot:checkShelf,hint:sHint,
 update(dt,now){
  halo.material.opacity=.25+.2*Math.sin(now*3);halo.scale.setScalar(1+.08*Math.sin(now*3));
  if(lightFlick>0){const f=Math.random()>.45?1:.05;Llobby.intensity=1.6*f;if(S.hallOpen&&!S.projOn){Lhall.intensity=.9*f;Lscreen.intensity=.7*(.3+.7*f)}Lbooth.intensity=2.0*f}
  else if(!S.projOn||scr.mode==='off'){Llobby.intensity=1.6*(.96+.04*Math.sin(now*40+Math.sin(now*3)*5));Lbooth.intensity=2.0*(.95+.05*Math.sin(now*17))}
  scr.acc+=dt;if(scr.mode!=='off'&&scr.acc>.08){scr.acc=0;scr.t+=.08;drawScreen()}
  if(S.hallOpen){const f=.9+.1*Math.sin(now*55);beam.material.opacity=Math.max(0,(S.projOn?.09:.05)*f)*(scr.mode==='off'&&S.projOn?0:1);updDust(dt);reels.forEach((r,i)=>r.rotation.z-=dt*(S.projOn?7:3)*(i?-1:1))}
  if(SHADOW.vis){const hp=camera.getWorldPosition(new V3()),fw=camera.getWorldDirection(new V3()),to=SHADOW.g.position.clone().setY(1.2).sub(hp).normalize();if(fw.dot(to)>.93)SHADOW.look+=dt;if(SHADOW.look>.9||now>SHADOW.until)hideShadow()}
  if(S.exitOpen&&!S.done){const p=camera.getWorldPosition(new V3());if(p.z<-21.2)endGame();dawn.material.color.lerp(new THREE.Color(0xffffff),.01)}
 }};
Object.assign(RVR,{CODE,key(id,code){const kp={kp1:KP1,kp2:KP2,kp3:KP3}[id];for(const ch of code)kp.press(ch)}});
window.__sc=1;
})();
