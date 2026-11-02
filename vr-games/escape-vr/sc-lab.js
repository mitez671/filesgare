/* سناریو: آزمایشگاه متروک */
(function(){
scene.fog=new THREE.Fog(0x06090d,5,26);scene.background=new THREE.Color(0x05070b);
const tileM=std(0xffffff,{map:patternTex('#6b7078','#7b8088','#8a9098',64),roughness:.5}),wallL=std(0xffffff,{map:patternTex('#3e5560','#4a6470','#5a7480',96),roughness:.7}),wallC=std(0x4a6a78),floorC=std(0x8aa0ac,{roughness:.4});
const COL={red:[0xff3030,'قرمز'],blue:[0x3070ff,'آبی'],green:[0x30d050,'سبز'],yellow:[0xffd030,'زرد']};const CK=['red','blue','green','yellow'];
/* ---- کدها ---- */
const CODE={};
CODE.cnt={red:ri(1,3),blue:ri(1,3),green:ri(1,3),yellow:ri(1,3)};CODE.drawer=''+CODE.cnt.red+CODE.cnt.blue+CODE.cnt.green+CODE.cnt.yellow;
{const d=[1,2,3,4,5,6,7,8,9].sort(()=>rnd()-.5);CODE.cyl={red:d[0],blue:d[1],green:d[2],yellow:d[3]};CODE.seq=CK.slice().sort(()=>rnd()-.5).slice(0,3);CODE.cold=CODE.seq.map(c=>CODE.cyl[c]).join('')}
/* ---- چراغ‌ها ---- */
const Lr=plight(0xd8ecff,1.6,12,0,2.8,-2),Ll=plight(0xcfe6ff,1.5,16,0,3.0,-11),Lcold=plight(0x9fd0ff,1.5,10,7,2.3,-11.5),Lx=plight(0xfff0d0,0,8,7.1,1.8,-17);
/* ---- اتاق‌ها ---- */
mkRoom({x0:-4,x1:4,z0:-6,z1:2,h:3.2,floor:tileM,wall:wallL,holes:{n:[{a0:-.8,a1:.8,y0:0,y1:2.3}]}});
mkRoom({x0:-5,x1:5,z0:-16,z1:-6.2,h:3.4,floor:tileM,wall:wallL,skip:['s'],holes:{e:[{a0:-12.4,a1:-11.0,y0:0,y1:2.3}]}});
mkRoom({x0:5.2,x1:9,z0:-15,z1:-8.5,h:2.8,floor:floorC,wall:wallC,skip:['w'],holes:{n:[{a0:6.6,a1:7.6,y0:0,y1:2.3}]}});
mkRoom({x0:6.4,x1:7.8,z0:-18.5,z1:-15.2,h:2.6,floor:floorC,wall:wallC,skip:['s']});
const dawn=bx(1.4,2.6,.05,new THREE.MeshBasicMaterial({color:0x10141c}),7.1,1.3,-18.45);
const door1=makeDoor('d1',-.8,-6.1,1.6,2.3,'x',Math.PI/2),door2=makeDoor('d2',5.1,-12.4,1.4,2.3,'z',Math.PI/2),hatch=makeDoor('hatch',6.6,-15.1,1.0,2.3,'x',Math.PI/2);
plaque('آزمایشگاه مرکزی',new V3(0,2.65,-6.0),0,1.0,.22,'#9fe8ff');plaque('سردخانه — دسترسی محدود',new V3(5.0,2.55,-11.7),-Math.PI/2,1.0,.22,'#ff9a9a');
/* ---- پذیرش ---- */
const note=noteObj('note',{pos:[-1.2,.006,-.9],flat:true,rot:-.5,label:'یادداشتِ افتاده روی زمین',paper:'#e4e6e8',ink:'#14202a',lines:[
 {t:'یادداشت شب‌کاریِ آخر',size:36,color:'#8a1c1c',weight:'bold'},
 'پروفسور رفت و کارتِ دسترسی را در کشوی میزِ پذیرش جا گذاشت.',
 'کشو قفلِ چهاررقمی دارد.',
 'پروفسور همیشه می‌گفت: «همهٔ رمزهایم را با فلاسک‌های همین آزمایشگاه ست می‌کنم.»',
 'ترتیبِ رنگ‌ها همان است که او همیشه می‌گفت: قرمز، آبی، سبز، زرد.']});
const halo=new THREE.Mesh(new THREE.RingGeometry(.2,.26,40),new THREE.MeshBasicMaterial({color:0xcfefff,transparent:true,opacity:.35,depthWrite:false,side:THREE.DoubleSide}));halo.rotation.x=-Math.PI/2;halo.position.set(-1.2,.012,-.9);world.add(halo);note.onGrab=()=>{halo.visible=false};
// قفسهٔ فلاسک‌ها
bx(.4,.04,1.8,M.metal,3.75,.95,-.7);bx(.4,.04,1.8,M.metal,3.75,1.45,-.7);bx(.04,1.9,1.8,M.dark,3.96,.95,-.7);blk(3.5,-1.6,4,.2);
{const list=[];for(const k of CK)for(let i=0;i<CODE.cnt[k];i++)list.push(k);while(list.length<12)list.push('empty');list.sort(()=>rnd()-.5);
 list.forEach((k,i)=>{const lv=i<6?0:1,idx=i%6,y=lv?1.47:.97,z=-1.5+idx*.28;if(k==='empty')return;
  const g=new THREE.Group(),c=COL[k][0];const body=new THREE.Mesh(new THREE.CylinderGeometry(.015,.055,.12,14),std(c,{emissive:c,emissiveIntensity:.25,transparent:true,opacity:.9}));body.position.y=.06;const neck=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,.07,10),std(0xdddddd,{transparent:true,opacity:.6}));neck.position.y=.155;g.add(body,neck);g.position.set(3.75,y,z);world.add(g)})}
plaque('فلاسک‌های پروفسور',new V3(3.93,1.9,-.7),-Math.PI/2,.5,.14,'#9fe8ff');
// میز و کشو و کی‌پد
furn(1.8,.8,.8,M.metal,0,.4,-3.3,true);furn(2.0,.05,.9,M.dark,0,.82,-3.3,false);surfaces.push({x0:-1,x1:1,z0:-3.75,z1:-2.85,y:.84});
const card=tagItem('card',{w:.086,h:.054,d:.004,pos:[0,0,0],lines:[{t:'کارت دسترسی',size:30,weight:'bold'},{t:'مجاز: آزمایشگاه',size:24,color:'#9fe8ff'}],col:'#14323f',edge:'#9fe8ff',label:'کارت دسترسی',readScale:2.5});
card.flat=true;card.restH=.004;
const drw=drawerObj('drawer',{pos:[.4,.62,-2.9],rotY:0,w:.6,item:card,label:'کشوی میز پذیرش',locked:()=>!S.drawerOk});
bx(.34,1.0,.3,M.metal,-1.7,.5,-3.3);blk(-1.87,-3.45,-1.53,-3.15);
const KP1=makeKeypad('kp1',4,CODE.drawer,new V3(-1.7,1.3,-3.14),0,()=>{S.drawerOk=true;drw.open||drw.toggle();toast('قفل کشو باز شد.',3000)},'قفل کشو');
// زنگ
{const b=new THREE.Group();b.position.set(-3.2,.62,-3.8);world.add(b);furn(1.0,.55,.7,M.metal,-3.2,.28,-3.8,true);const d=new THREE.Mesh(new THREE.SphereGeometry(.06,16,10,0,6.3,0,1.55),std(0xc9a24a,{metalness:.8,roughness:.3,emissive:0x221a06}));d.position.y=0;b.add(d);
 mkObj('bell',b,{kind:'press',label:'زنگِ پذیرش (راهنمایی)',use(){bellRing(b.getWorldPosition(new V3()));giveHint()}})}
// کارت‌خوان
{const rd=new THREE.Group();rd.position.set(1.4,1.2,-5.97);world.add(rd);bx(.14,.2,.03,M.dark,0,0,0,rd);const led=new THREE.Mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:0xff2a2a}));led.position.set(0,.07,.02);rd.add(led);bx(.1,.012,.02,M.black,0,-.02,.02,rd);
 mkObj('reader',rd,{kind:'press',accR:.5,label:()=>S.labOpen?'کارت‌خوان (باز)':'کارت‌خوان (کارت لازم است)',use(){if(!S.labOpen)toast('کارت دسترسی لازم است.',3000)},accepts:it=>it.id==='card'&&!S.labOpen,take(it){it.g.visible=false;S.labOpen=true;led.material.color.setHex(0x2aff6a);play('metalClick');chime();door1.openIt()}})}
decor('reception-counter-module-7a9c01',{x:2.4,z:-4.6,h:1.05,w:1.2,d:.6,col:0x5a6a74,solid:true});
decor('office-chair-7c9874',{x:0,z:-4.3,h:.95,w:.55,d:.55,col:0x222a30,ry:.4});
decor('wall-clock-05f8ff',{x:0,y:2.3,z:1.95,h:.4,w:.4,d:.05,col:0xdddddd,ry:Math.PI});
decor('breakout-sofa-module-1bb15e',{x:-2.8,z:1.0,h:.8,w:1.6,d:.8,col:0x2a3a4a,ry:Math.PI/2,solid:true});
decor('illuminated-exit-sign-23becd',{x:-3.6,y:2.5,z:-5.95,h:.2,w:.5,d:.05,col:0x22ff77});
/* ---- آزمایشگاه ---- */
decor('island-bench-spine-d046b2',{x:2.2,z:-9,h:.95,w:2.2,d:.9,col:0x6a7a84,solid:true});
decor('centrifuge-benchtop-b76ef2',{x:1.8,y:.95,z:-9,h:.4,w:.4,d:.4,col:0xcccccc});
decor('research-microscope-77ce04',{x:2.7,y:.95,z:-9,h:.4,w:.25,d:.25,col:0x2a2a2a});
decor('biosafety-cabinet-a46204',{x:-2.6,z:-15.2,h:1.9,w:1.4,d:.8,col:0x7a8a94,solid:true});
decor('lab-coat-rack-a089e3',{x:4.5,z:-7.2,h:1.7,w:.5,d:.5,col:0xeeeeee,solid:true});
decor('safety-shower-and-eyewash-1f5f20',{x:-4.4,z:-6.8,h:2.3,w:.5,d:.5,col:0xd8c020,solid:true});
decor('hazard-sign-plate-d54657',{x:-4.95,y:1.9,z:-14,h:.3,w:.04,d:.3,col:0xffd030});
// نیمکتِ لوله‌ها
furn(3.2,.95,.8,M.metal,0,.475,-15.3,true);furn(3.4,.05,.9,M.dark,0,.97,-15.3,false);surfaces.push({x0:-1.7,x1:1.7,z0:-15.75,z1:-14.85,y:1.0});
const tslots=makeSlots('t',5,1.0,1.0,-15.3,-.5,0,.1,0x1a2430);
plaque('شروع',new V3(1.0,1.55,-15.74),0,.3,.12,'#9fe8ff');plaque('پایان',new V3(-1.0,1.55,-15.74),0,.3,.12,'#9fe8ff');
const SPEC=[['قرمز',0xff3030],['نارنجی',0xff8a20],['زرد',0xffd030],['سبز',0x30d050],['آبی',0x3070ff]];
const tubes=SPEC.map((s,i)=>{const g=new THREE.Group(),c=s[1];const tb=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.16,12),std(0xdddddd,{transparent:true,opacity:.35}));tb.position.y=0;const lq=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.1,12),std(c,{emissive:c,emissiveIntensity:.35}));lq.position.y=-.02;g.add(tb,lq);
 const pos=[[-3.2,-12.8],[-2.9,-12.6],[-3.3,-12.3],[-2.8,-13.0],[-3.1,-12.1]].sort(()=>rnd()-.5)[i];g.position.set(pos[0],.78,pos[1]);world.add(g);
 const o=mkObj('t'+i,g,{kind:'grab',restH:.08,rank:i,slotable:true,label:'لولهٔ '+s[0]});return o});
furn(1.2,.7,1.6,M.metal,-3.0,.35,-12.5,true);surfaces.push({x0:-3.6,x1:-2.4,z0:-13.3,z1:-11.7,y:.7});tubes.forEach(o=>{o.g.position.y=.78});
// پوستر طیف
{const c=cv(512,320),g=c.getContext('2d');g.fillStyle='#10161c';g.fillRect(0,0,512,320);g.strokeStyle='#9fe8ff';g.lineWidth=6;g.strokeRect(6,6,500,308);putText(g,'ترتیبِ طیفِ نور',256,16,480,38,'#fff',44,{weight:'bold'});
 SPEC.forEach((s,i)=>{const x=440-i*90;g.fillStyle='#'+s[1].toString(16).padStart(6,'0');g.beginPath();g.arc(x,150,34,0,7);g.fill();putText(g,s[0],x,196,86,24,'#ddd',28)});
 g.fillStyle='#9fe8ff';g.font='bold 30px '+FONT;g.textAlign='center';g.direction='ltr';g.fillText('← ← ← ←',256,268);putText(g,'از اولین تا آخرین',256,276,480,22,'#9fe8ff',26);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.75),new THREE.MeshStandardMaterial({map:ctex(c),emissive:0x223344,emissiveMap:ctex(c),emissiveIntensity:.5}));m.position.set(-4.97,1.9,-10.8);m.rotation.y=Math.PI/2;world.add(m);mkObj('poster',m,{kind:'press',label:'پوستر طیف نور',use(){}})}
// مانیتور
const mon=monitorObj('mon',{pos:[3.0,1.7,-15.9],rotY:0,w:.8,h:.45,lines:[{t:'سامانهٔ نمونه‌ها',size:42},{t:'در انتظار ردیف درست…',size:30,color:'#ffcf7a'}]});
// کپسول‌ها
CK.forEach((k,i)=>{const z=-8.2-i*1.4;const g=new THREE.Group();g.position.set(-4.55,0,z);world.add(g);const cc=COL[k][0];const cy=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,1.25,16),std(cc,{metalness:.4,roughness:.5}));cy.position.y=.65;g.add(cy);const cap=new THREE.Mesh(new THREE.SphereGeometry(.14,16,8,0,6.3,0,1.57),std(cc,{metalness:.4,roughness:.5}));cap.position.y=1.27;g.add(cap);
 const c=cv(128,128),k2=c.getContext('2d');k2.fillStyle='#f4f4f4';k2.fillRect(0,0,128,128);k2.fillStyle='#111';k2.font='bold 96px '+FONT;k2.textAlign='center';k2.textBaseline='middle';k2.fillText(fa(CODE.cyl[k]),64,70);
 const nm=new THREE.Mesh(new THREE.PlaneGeometry(.2,.2),new THREE.MeshBasicMaterial({map:ctex(c)}));nm.position.set(.145,.8,0);nm.rotation.y=Math.PI/2;g.add(nm);blk(-4.7,z-.15,-4.4,z+.15);
 mkObj('cyl'+k,g,{kind:'press',label:'کپسول '+COL[k][1],use(){}})});
function onSlot(){if(S.tubesOk)return;if(tslots.every(s=>s.occ&&s.occ.rank===s.idx)){S.tubesOk=true;chime();tslots.forEach(s=>s.mesh.material.emissive.setHex(0x0b4a22));
 mon.draw([{t:'ردیف تأیید شد',size:34},{t:'ترتیب خواندن کپسول‌ها:',size:28,color:'#ffcf7a'},{t:CODE.seq.map((c,i)=>fa(i+1)+') '+COL[c][1]).join('  '),size:34},{t:'عدد روی هر کپسول را بخوان',size:24,color:'#9fe8ff'}]);toast('مانیتور روشن شد: ترتیبِ خواندنِ کپسول‌ها را نشان می‌دهد.',6000)}}
// کی‌پد سردخانه
const KP2=makeKeypad('kp2',3,CODE.cold,new V3(4.95,1.3,-10.0),-Math.PI/2,()=>{S.coldOpen=true;door2.openIt()},'در سردخانه');
/* ---- سردخانه ---- */
decor('ultra-low-freezer-9a84fb',{x:8.5,z:-9.6,h:1.9,w:.9,d:.9,col:0x99aab4,solid:true});
decor('glass-door-sample-fridge-386715',{x:8.5,z:-12.4,h:1.9,w:.9,d:.9,col:0x8899a4,solid:true});
decor('chemical-shelving-rack-3a188c',{x:5.6,z:-14.3,h:1.8,w:.5,d:.9,col:0x555d66,solid:true});
{const L=leverObj('lvx',{pos:[8.0,1.3,-14.92],rotY:0,color:0xff2020,label:'اهرم آزادسازی اضطراری',onPress(L){if(S.exitOpen)return;L.set(true);S.exitOpen=true;chime();for(let i=0;i<4;i++){tn(660,.4,.12,'square',440,null,i*.6);}lightFlick=3;toast('آلارم! دریچهٔ اضطراری باز شد؛ بدو!',4500);hatch.openIt();Lx.intensity=1.2}})}
/* ---- شیء سناریو ---- */
SC={id:'lab',start:[0,1.0,0],endTitle:'از آزمایشگاه فرار کردی!',endText:'هوای آزاد بوی باران می‌دهد.',zone:[6.4,7.8,-18.3,-16.5],
 intro:'شب است و آزمایشگاه خالی و سرد. یادداشتی روی زمین افتاده…',
 room:()=>{const p=camera.getWorldPosition(new V3());return p.x>5.1?'cold':p.z<-6.1?'lab':'reception'},rain:r=>.015,
 omens:r=>['flick','step','whisper','creak','heart','knock'],
 hint(){const L=!S.labOpen?(drw.open?['کارت را بردار و به کارت‌خوانِ کنار در نزدیک کن (روی صفحه: روی کارت‌خوان کلیک کن).']:['یادداشت را بخوان: پروفسور گفته بود رمزهایش را با فلاسک‌های آزمایشگاه ست می‌کند.','ببین از هر رنگ چند فلاسک هست؛ ترتیب رنگ‌ها در یادداشت آمده. کی‌پدِ کشو کنار میز است.'])
  :!S.tubesOk?['لوله‌ها روی میزِ ته آزمایشگاه‌اند؛ آن‌ها را روی نیمکتِ انتهایی بچین.','ترتیب را از پوستر طیفِ نور بخوان: قرمز اول (سمت راستِ نیمکت).']
  :!S.coldOpen?['مانیتور ترتیبِ خواندنِ کپسول‌ها را می‌گوید؛ عددِ روی هر کپسول را به همان ترتیب روی قفلِ سردخانه بزن.']
  :['اهرمِ قرمزِ آزادسازی در سردخانه است.'];return L[Math.min(L.length-1,S.hintN++%L.length)]},
 onSlot,
 update(dt,now){halo.material.opacity=.25+.2*Math.sin(now*3);const f=lightFlick>0?(Math.random()>.45?1:.08):1;Lr.intensity=1.6*f*(.97+.03*Math.sin(now*50));Ll.intensity=1.5*f;Lcold.intensity=1.5*(lightFlick>0?f:.97+.03*Math.sin(now*9));
  if(S.exitOpen)dawn.material.color.lerp(new THREE.Color(0xdbe8ff),.01)}};
Object.assign(RVR,{CODE,key(id,code){const kp=({kp1:KP1,kp2:KP2})[id];for(const ch of code)kp.press(ch)}});
})();
