/* سناریو: عمارت مه‌آلود */
(function(){
scene.fog=new THREE.Fog(0x0a0c10,4,24);scene.background=new THREE.Color(0x07080c);
const wallM=std(0xffffff,{map:patternTex('#2b2230','#40334c','#8a7648',128)}),floorW=std(0xffffff,{map:patternTex('#3a2414','#4a301c','#5a3c22',128)}),stone=std(0x55565c),stoneW=std(0x45464d);
/* ---- کدها ---- */
const CODE={};
{let H=ri(1,11),M5=pick([10,20,35,40,50]);CODE.H=H;CODE.M=M5;
 const years=[];while(years.length<5){const y=ri(1260,1395);if(!years.some(v=>Math.abs(v-y)<8))years.push(y)}
 const digs=[];while(digs.length<5){const d=ri(1,9);if(!digs.includes(d))digs.push(d)}
 CODE.books=years.map((y,i)=>({y,d:digs[i]}));CODE.sorted=CODE.books.slice().sort((a,b)=>a.y-b.y);CODE.lib=CODE.sorted.map(b=>b.d).join('');
 const cols=[['قرمز',0xff3030],['آبی',0x3080ff],['سبز',0x30d060],['زرد',0xffd030]];CODE.levers=cols.map((c,i)=>({i,n:c[0],c:c[1]}));CODE.order=CODE.levers.slice().sort(()=>rnd()-.5)}
const TSTR=CODE.M===0?'ساعت '+fa(CODE.H)+' تمام':'ساعت '+fa(CODE.H)+' و '+fa(CODE.M)+' دقیقه';
/* ---- چراغ‌ها ---- */
const Lh=plight(0xffb070,2.2,12,0,2.8,-2),Ll=plight(0xffa060,2.0,12,0,2.8,-10),Lc=plight(0x80ffb0,1.8,10,6.6,2.4,-10.5),Lx=plight(0xcfe3ff,0,8,6.8,1.8,-16);
/* ---- اتاق‌ها ---- */
mkRoom({x0:-4,x1:4,z0:-6,z1:2,h:3.4,floor:floorW,wall:wallM,holes:{n:[{a0:-.8,a1:.8,y0:0,y1:2.3}]}});
mkRoom({x0:-4,x1:4,z0:-14,z1:-6.2,h:3.4,floor:floorW,wall:wallM,skip:['s'],holes:{e:[{a0:-10.9,a1:-9.5,y0:0,y1:2.3}]}});
mkRoom({x0:4.2,x1:9,z0:-14,z1:-7.5,h:3.0,floor:stone,wall:stoneW,skip:['w'],holes:{n:[{a0:6.1,a1:7.5,y0:0,y1:2.4}]}});
mkRoom({x0:6.0,x1:7.6,z0:-17.5,z1:-14.2,h:2.8,floor:stone,wall:stoneW,skip:['s']});
const dawn=bx(1.6,2.8,.05,new THREE.MeshBasicMaterial({color:0x10141c}),6.8,1.4,-17.45);
const door1=makeDoor('d1',-.8,-6.1,1.6,2.3,'x',Math.PI/2),door2=makeDoor('d2',4.1,-10.9,1.4,2.3,'z',Math.PI/2);
plaque('کتابخانه',new V3(0,2.65,-6.0),0,.9,.22,'#ffcf7a');
/* ---- تالار: کاغذ، قاب عکس، ساعت ---- */
const note=noteObj('note',{pos:[-1.0,.006,-1.1],flat:true,rot:.4,label:'کاغذِ افتاده روی زمین',lines:[
 {t:'این خانه ساعت‌ها را نگه می‌دارد…',size:36,color:'#6b1b1b',weight:'bold'},
 'پدربزرگ که رفت، ساعتِ دیواری ایستاد و کلیدِ کتابخانه جایی پنهان شد.',
 'زمانی را که روی قابِ عکسِ کنار شومینه نوشته‌اند به ساعت بده؛ شاید ساعت دوباره حرف بزند.',
 'بعد از آن، کتاب‌ها منتظرند.'],paper:'#dccfae'});
const halo=new THREE.Mesh(new THREE.RingGeometry(.2,.26,40),new THREE.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.set(-1.0,.012,-1.1);world.add(halo);note.onGrab=()=>{halo.visible=false};
// شومینه و قاب عکس
furn(.7,1.2,1.8,stone,-3.55,.6,-2.0,true);
{const c=cv(320,420),g=c.getContext('2d');g.fillStyle='#1a1410';g.fillRect(0,0,320,420);g.strokeStyle='#b8924a';g.lineWidth=14;g.strokeRect(7,7,306,406);g.fillStyle='#3a3a42';g.beginPath();g.arc(160,140,60,0,7);g.fill();g.beginPath();g.ellipse(160,300,100,80,0,Math.PI,0);g.fill();
 putText(g,'پدربزرگ',160,215,280,34,'#e8dcb8',40,{weight:'bold'});putText(g,TSTR+' خانه خاموش شد',160,262,270,28,'#ffd9a0',36);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(.64,.84),new THREE.MeshStandardMaterial({map:ctex(c),emissive:0x332a1c,emissiveMap:ctex(c),emissiveIntensity:.5}));m.position.set(-3.96,1.95,-2.0);m.rotation.y=Math.PI/2;world.add(m);mkObj('portrait',m,{kind:'press',label:'قاب عکس',use(){toast('روی قاب نوشته: «'+TSTR+' خانه خاموش شد»',5000)}})}
// ساعت
let hh=12,mm=0;
const cc=cv(256,256),cg=cc.getContext('2d'),ct=ctex(cc);
function drawClock(){cg.clearRect(0,0,256,256);cg.fillStyle='#e8dcb8';cg.beginPath();cg.arc(128,128,124,0,7);cg.fill();cg.strokeStyle='#3a2414';cg.lineWidth=9;cg.stroke();
 cg.fillStyle='#222';cg.font='bold 26px '+FONT;cg.textAlign='center';cg.textBaseline='middle';cg.direction='ltr';for(let i=1;i<=12;i++){const a=i/12*6.2832-1.5708;cg.fillText(fa(i),128+Math.cos(a)*98,128+Math.sin(a)*98)}
 const hand=(a,l,w)=>{cg.strokeStyle='#111';cg.lineWidth=w;cg.lineCap='round';cg.beginPath();cg.moveTo(128,128);cg.lineTo(128+Math.cos(a)*l,128+Math.sin(a)*l);cg.stroke()};
 hand(((hh%12)+mm/60)/12*6.2832-1.5708,58,9);hand(mm/60*6.2832-1.5708,92,5);cg.fillStyle='#111';cg.beginPath();cg.arc(128,128,8,0,7);cg.fill();ct.needsUpdate=true}
{const m=new THREE.Mesh(new THREE.CircleGeometry(.3,32),new THREE.MeshBasicMaterial({map:ct,transparent:true}));m.position.set(3.97,2.1,-2.0);m.rotation.y=-Math.PI/2;world.add(m);mkObj('clockface',m,{kind:'press',label:'ساعت دیواری',use(){}});}
drawClock();
const stH=stepper('stH',{pos:[3.93,1.45,-2.42],rotY:-Math.PI/2,label:'ساعت',min:1,max:12,step:1,val:12,onChange:v=>{hh=v;drawClock();chk()}}),stM=stepper('stM',{pos:[3.93,1.45,-1.58],rotY:-Math.PI/2,label:'دقیقه',min:0,max:55,step:5,val:0,fmt:v=>fa(pad2(v)),onChange:v=>{mm=v;drawClock();chk()}});
// کابینت زیر ساعت
const cab=new THREE.Group();cab.position.set(3.7,0,-2.0);world.add(cab);
bx(.02,.6,.5,M.woodD,.2,.4,0,cab);bx(.4,.02,.5,M.woodD,.0,.7,0,cab);bx(.4,.02,.5,M.woodD,0,.1,0,cab);bx(.4,.6,.02,M.woodD,0,.4,.25,cab);bx(.4,.6,.02,M.woodD,0,.4,-.25,cab);
const cdoor=new THREE.Group();cdoor.position.set(-.2,.4,-.25);cab.add(cdoor);bx(.03,.58,.5,M.wood,0,0,.25,cdoor);
blk(3.45,-2.28,3.95,-1.72);
const key=new THREE.Group();{const gm=std(0xc9a24a,{metalness:.8,roughness:.3,emissive:0x221a06});const r=new THREE.Mesh(new THREE.TorusGeometry(.03,.007,8,16),gm);r.position.y=.07;key.add(r);const s=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.12,6),gm);s.position.y=0;key.add(s);bx(.025,.012,.01,gm,.014,-.05,0,key);bx(.02,.012,.01,gm,.012,-.03,0,key);key.rotation.z=Math.PI/2;}
key.position.set(3.78,.17,-2.0);world.add(key);
const keyO=mkObj('key',key,{kind:'grab',restH:.03,label:'کلید برنجی',enabled:()=>S.keyOut});
function chk(){if(!S.keyOut&&hh===CODE.H&&mm===CODE.M){S.keyOut=true;chime();play('metalLatch',{pos:cab.getWorldPosition(new V3())});tween(.9,e=>{cdoor.rotation.y=-1.6*e});toast('ساعت دوباره کار کرد؛ در کابینتِ زیرش باز شد.',5000)}}
// قفل در کتابخانه
{const lk=new THREE.Group();lk.position.set(1.3,1.15,-5.97);world.add(lk);bx(.12,.2,.03,M.gold,0,0,0,lk);bx(.02,.05,.02,M.black,0,0,.02,lk);
 mkObj('lock',lk,{kind:'press',accR:.5,label:()=>S.libOpen?'قفل باز است':'قفل در کتابخانه (کلید لازم است)',use(){if(!S.libOpen)toast('قفل است؛ کلید را بیاور.',3000)},accepts:it=>it.id==='key'&&!S.libOpen,take(it){it.g.visible=false;S.libOpen=true;play('metalLatch');play('metalClick',{delay:.15});chime();door1.openIt()}})}
// زنگ راهنما
{const b=new THREE.Group();b.position.set(2.8,.92,0.9);world.add(b);bx(.7,.9,.7,M.woodD,2.8,.45,.9);const d=new THREE.Mesh(new THREE.SphereGeometry(.07,16,10,0,6.3,0,1.55),std(0xc9a24a,{metalness:.8,roughness:.3,emissive:0x221a06}));b.add(d);blk(2.45,.55,3.15,1.25);
 mkObj('bell',b,{kind:'press',label:'زنگِ کمک (راهنمایی)',use(){bellRing(b.getWorldPosition(new V3()));giveHint()}})}
// دکور
decor('lounge-armchair-5a72ca',{x:-2.4,z:1.2,h:.95,w:.8,d:.8,col:0x5a2a2a,ry:.6,solid:true});
decor('brass-candelabra-89ab76',{x:-3.55,y:1.2,z:-2.7,h:.45,w:.2,d:.2,col:0xb89a4b});
decor('framed-wall-art-d2c8a2',{x:2.0,y:1.7,z:1.95,h:.7,w:.6,d:.04,col:0x3a3a50,ry:Math.PI});
decor('table-lamp-e25998',{x:2.8,y:.9,z:1.2,h:.4,w:.25,d:.25,col:0xe8c27a});
persianRug(0,-1.5,3.6,2.4);
decor('crystal-chandelier-55d279',{x:0,y:2.5,z:-2,h:.7,w:.7,d:.7,col:0xdde6ff});
/* ---- کتابخانه ---- */
// میز
furn(1.9,.9,.9,M.wood,-2.2,.45,-9.5,true);surfaces.push({x0:-3.15,x1:-1.25,z0:-9.95,z1:-9.05,y:.9});
const TITLES=['گلشنِ راز','آیینهٔ شب','تاریخ مه','باغ‌های گمشده','سفرنامهٔ شمال','دفتر ستارگان','قصه‌های کهن'];
const bookObjs=CODE.books.map((b,i)=>{const o=tagItem('b'+i,{pos:[-2.9+i*.38,.9,-9.5+((i%2)?.15:-.15)],rot:.2*(i-2),lines:[{t:TITLES[i],size:26,weight:'bold'},{t:fa(b.y),size:40,color:'#ffd9a0',weight:'bold'},{t:'شمارهٔ فهرست',size:18,color:'#e8c0c0'},{t:fa(b.d),size:56,color:'#ff6a6a',weight:'bold'}],col:['#4a2a22','#22344a','#2a4a2a','#4a3a22','#3a2244'][i],rank:CODE.sorted.indexOf(b),label:'کتاب «'+TITLES[i]+'» — '+fa(b.y)});o.restH=.115;return o});
// قفسه
bx(2.8,.06,.4,M.wood,0,1.27,-13.7);bx(3.0,2.4,.06,M.woodD,0,1.3,-13.95);blk(-1.5,-14,1.5,-13.5);
const bslots=makeSlots('b',5,1.0,1.3,-13.7,-.5,0,.13,0x2a1d14);
plaque('کهنه‌ترین',new V3(1.0,1.95,-13.9),0,.5,.14,'#ffcf7a');plaque('جدیدترین',new V3(-1.0,1.95,-13.9),0,.5,.14,'#ffcf7a');
S.shelfOk=false;
function onSlot(){if(S.shelfOk)return;if(bslots.every(s=>s.occ&&s.occ.rank===s.idx)){S.shelfOk=true;chime();bslots.forEach(s=>s.mesh.material.emissive.setHex(0x0b4a22));toast('ترتیب درست است. عددهای قرمز را از راست به چپ بخوان و روی قفلِ در شرقی بزن.',7000)}}
// پنجرهٔ رنگی
{const c=cv(256,512),g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,256,512);CODE.order.forEach((l,i)=>{g.fillStyle='#'+l.c.toString(16).padStart(6,'0');g.beginPath();g.arc(128,92+i*110,44,0,7);g.fill();g.strokeStyle='#000';g.lineWidth=8;g.stroke()});g.strokeStyle='#8a7648';g.lineWidth=12;g.strokeRect(6,6,244,500);
 const t=ctex(c),m=new THREE.Mesh(new THREE.PlaneGeometry(.7,1.4),new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.6}));m.position.set(-3.96,1.9,-10.0);m.rotation.y=Math.PI/2;world.add(m);mkObj('window',m,{kind:'press',label:'پنجرهٔ رنگی',use(){toast('چهار شیشهٔ رنگی، از بالا به پایین…',3500)}})}
// کی‌پد در شرقی
const KP=makeKeypad('kp2',5,CODE.lib,new V3(3.95,1.3,-8.3),-Math.PI/2,()=>{S.door2=true;door2.openIt()},'در سردابه');
decor('alcove-bookcase-83894d',{x:-3.5,z:-12.2,h:2.2,w:.5,d:1.4,col:0x4a2c1a,ry:Math.PI/2,solid:true});
decor('iron-chandelier-1337dc',{x:0,y:2.4,z:-10,h:.8,w:.9,d:.9,col:0x222222});
persianRug(0,-10,3.2,2.2,{red:'#4a1a3a',navy:'#10304a'});
/* ---- سرداب ---- */
decor('standing-brazier-c9e4ee',{x:8.2,z:-13,h:1.2,w:.5,d:.5,col:0x333333,solid:true});
decor('oak-barrel-b65311',{x:8.4,z:-8.2,h:.9,w:.6,d:.6,col:0x5a3a1c,solid:true});
decor('stone-altar-8f3a0a',{x:5.3,z:-12.6,h:1,w:.8,d:1.2,col:0x66666c,solid:true});
const gate=pf('barred-portcullis-2aa444',{x:6.8,y:0,z:-14.0,h:2.4},(()=>{const g=new THREE.Group();for(let i=-6;i<=6;i++){const b=bx(.05,2.4,.05,M.dark,i*.11,1.2,0,g)}bx(1.4,.06,.06,M.dark,0,1.0,0,g);return g})());
blk(6.1,-14.3,7.5,-13.8,()=>!S.gateOpen);
let pressed=[];
const levers=CODE.levers.map((l,i)=>leverObj('lv'+i,{pos:[8.93,1.3,-11.1+i*.55],rotY:-Math.PI/2,color:l.c,label:'اهرم '+l.n,onPress(L){if(S.gateOpen||L.on)return;
 if(CODE.order[pressed.length].i===l.i){pressed.push(l.i);L.set(true);if(pressed.length===4){S.gateOpen=true;S.exitOpen=true;chime();nb(3,150,40,.5,'lowpass');toast('دروازه بالا می‌رود…',4000);tween(3.2,e=>{gate.position.y=2.7*e});Lx.intensity=1.2}}
 else{pressed=[];levers.forEach(v=>v.set(false));S.wrong++;tension(.15);buzz();play('creak3',{v:.8,r:.7});toast('اهرم‌ها از جا پریدند. ترتیب را از پنجرهٔ رنگیِ کتابخانه بخوان.',4500)}}}));
/* ---- شیء سناریو ---- */
SC={id:'mansion',start:[0,1.0,0],endTitle:'از عمارت بیرون آمدی!',endText:'مه کنار می‌رود و سپیده از لای درخت‌ها پیداست.',zone:[6.0,7.6,-17.4,-15.8],
 intro:'نیمه‌شب است و در عمارتی پر از مه گیر افتاده‌ای. دنبال هر چیزی بگرد که روی زمین افتاده…',
 room:()=>{const p=camera.getWorldPosition(new V3());return p.x>4.1?'cellar':p.z<-6.1?'library':'hall'},
 rain:r=>r==='hall'?.04:.02,omens:r=>['flick','step','whisper','creak','heart','thunder','knock'],
 hint(){const L=!S.keyOut?['کاغذ روی زمین را بخوان.','زمانِ روی قابِ عکس کنار شومینه را به ساعت دیواریِ روبه‌رو بده (دو دکمهٔ ساعت و دقیقه).']
  :!S.libOpen?['کلید را از کابینت بردار و به قفلِ کنار در کتابخانه نزدیک کن (روی صفحه: روی قفل کلیک کن).']
  :!S.shelfOk?['کتاب‌ها را به‌ترتیب سالِ چاپ روی قفسه بچین: کهنه‌ترین سمت راست.']
  :!S.door2?['عددهای قرمز روی کتاب‌ها را از راست به چپ بخوان و روی کی‌پدِ در شرقی بزن.']
  :['به رنگ‌های پنجرهٔ رنگیِ کتابخانه از بالا به پایین نگاه کن؛ اهرم‌ها را به همان ترتیب بکش.'];return L[Math.min(L.length-1,S.hintN++%L.length)]},
 onSlot,
 update(dt,now){halo.material.opacity=.25+.2*Math.sin(now*3);
  const f=lightFlick>0?(Math.random()>.45?1:.1):1;Lh.intensity=2.2*f*(.97+.03*Math.sin(now*37));Ll.intensity=2.0*f;Lc.intensity=1.8*(lightFlick>0?f:(.95+.05*Math.sin(now*13)));
  if(S.exitOpen)dawn.material.color.lerp(new THREE.Color(0xdbe8ff),.01)}};
Object.assign(RVR,{clk:()=>[hh,mm],CODE,key(id,code){for(const ch of code)KP.press(ch)},pressLevers(){CODE.order.forEach(l=>RVR.use('lv'+l.i))}});
})();
