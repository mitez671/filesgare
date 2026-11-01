/* Dedicated geometry and materials for Earth Atlas. No gameplay or tile-engine hooks. */
window.buildAtlasRoom=function(THREE,room,floorG,renderer){
 VRDecor.configure(THREE,renderer);
 const g=new THREE.Group();g.name='Atlas room · walnut, brass and cartographic instruments';room.add(g);
 const wood=VRDecor.material('walnut',[3,2]),bronze=VRDecor.material('bronze',[1,1],{color:0xe5c68d,metalness:.65,roughness:.38});
 const wallMat=new THREE.MeshStandardMaterial({color:0x193b30,roughness:.97});
 const cream=new THREE.MeshStandardMaterial({color:0xd2c3a5,roughness:.87});
 const dark=new THREE.MeshStandardMaterial({color:0x0b211c,roughness:.75});
 const glow=new THREE.MeshBasicMaterial({color:0xdcc58c});
 const box=(w,h,d,x,y,z,mat,parent=g)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;};
 const cyl=(r1,r2,h,x,y,z,mat,parent=g)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,64),mat);m.position.set(x,y,z);parent.add(m);return m;};
 const ring=(radius,tube,x,y,z,mat,parent=g)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,96),mat);m.position.set(x,y,z);parent.add(m);return m;};
 // Dimensional flooring, restrained grain and fine concentric brass inlay.
 floorG.clear();const fl=new THREE.Mesh(new THREE.CircleGeometry(8,96),VRDecor.material('parquet',[10,10],{color:0x8d8270,roughness:.6}));fl.rotation.x=-Math.PI/2;floorG.add(fl);
 for(const radius of [1.88,1.91,3.6]){const r=ring(radius,.004,0,.008,-1,bronze,floorG);r.rotation.x=Math.PI/2;}
 // The globe sits on a modeled walnut pedestal, with a recessed radial scale.
 const desk=new THREE.Group();desk.name='Handcrafted globe desk and brass meridian';desk.position.z=-1;g.add(desk);
 cyl(.4,.46,.08,0,.08,0,wood,desk);cyl(.23,.34,.64,0,.42,0,wood,desk);
 cyl(.525,.49,.075,0,.795,0,bronze,desk);cyl(.57,.57,.07,0,.853,0,wood,desk);
 const rim=ring(.568,.008,0,.886,0,bronze,desk);rim.rotation.x=Math.PI/2;
 const scale=ring(.49,.0028,0,.891,0,bronze,desk);scale.rotation.x=Math.PI/2;
 const marks=new THREE.Group();desk.add(marks);
 for(let i=0;i<72;i++){const a=i/72*Math.PI*2,major=i%6===0;const m=box(major?.003:.0015,.001,major?.025:.012,Math.cos(a)*.516,.893,Math.sin(a)*.516,bronze,marks);m.rotation.y=-a+Math.PI/2;}
 const meridian=ring(.404,.006,0,1.3,0,bronze,desk);meridian.rotation.z=-.24;meridian.rotation.y=.3;
 const equator=ring(.393,.003,0,1.3,0,bronze,desk);equator.rotation.set(Math.PI/2,.1,.12);
 cyl(.008,.008,.065,0,.925,0,bronze,desk);
 // Room shell, framed panels and pilasters.
 box(12,5,.22,0,2.5,-4.6,wallMat);
 for(const sx of [-1,1]){box(.22,5,10,sx*6,2.5,-.5,wallMat);box(12,.18,.3,0,.09,-4.4,wood);}
 for(let i=-3;i<=3;i++){
  const x=i*1.55;box(.065,3.4,.075,x,1.8,-4.44,bronze);
  box(1.43,.035,.07,x+.775,.3,-4.43,wood);box(1.43,.035,.07,x+.775,3.35,-4.43,wood);
 }
 box(12,.14,.15,0,3.55,-4.4,wood);box(12,.022,.16,0,3.45,-4.38,bronze);
 // Three large inset windows, a physical curve rather than a painted arch.
 for(const wx of [-3.1,0,3.1]){
  const sh=new THREE.Shape();sh.moveTo(-.58,0);sh.lineTo(-.58,1.5);sh.absarc(0,1.5,.58,Math.PI,0,true);sh.lineTo(.58,0);sh.closePath();
  const p=new THREE.Mesh(new THREE.ShapeGeometry(sh),dark);p.position.set(wx,.85,-4.35);g.add(p);
  const pts=[];pts.push(new THREE.Vector3(-.61,0,0),new THREE.Vector3(-.61,1.5,0));for(let j=0;j<=32;j++){const a=Math.PI-j/32*Math.PI;pts.push(new THREE.Vector3(Math.cos(a)*.61,1.5+Math.sin(a)*.61,0));}pts.push(new THREE.Vector3(.61,0,0));
  const curve=new THREE.CatmullRomCurve3(pts);const trim=new THREE.Mesh(new THREE.TubeGeometry(curve,80,.018,6,false),bronze);trim.position.set(wx,.85,-4.3);g.add(trim);
  box(.018,1.95,.03,wx,1.85,-4.25,bronze);box(1.16,.018,.03,wx,1.83,-4.24,bronze);
  // Star chart on the window's inset: precise grid lines, calm light.
  const cv=document.createElement('canvas');cv.width=256;cv.height=384;const x=cv.getContext('2d');x.fillStyle='#0a2925';x.fillRect(0,0,256,384);x.strokeStyle='#8cb5a238';x.lineWidth=1;
  for(let j=0;j<7;j++){x.beginPath();x.ellipse(128,188,22+j*19,160,0,0,Math.PI*2);x.stroke();}for(let j=0;j<9;j++){x.beginPath();x.moveTo(0,40+j*37);x.lineTo(256,40+j*37);x.stroke();}
  let seed=673+wx*10;for(let j=0;j<55;j++){seed=(seed*16807)%2147483647;const xx=(seed%238)+9;seed=(seed*16807)%2147483647;x.fillStyle=j%5?'#b8d2b6':'#dbc486';x.beginPath();x.arc(xx,(seed%320)+22,j%5?.6:1.3,0,Math.PI*2);x.fill();}
  const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;
  const star=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.65),new THREE.MeshBasicMaterial({map:tex}));star.position.set(wx,1.8,-4.28);g.add(star);
 }
 // Physical library on the left: shelf edges, unequal books, brass endcaps.
 const shelf=new THREE.Group();shelf.position.set(-1.65,0,-2.5);shelf.rotation.y=.17;g.add(shelf);
 box(1.1,.07,.32,0,.23,0,wood,shelf);box(1.1,.07,.32,0,.65,0,wood,shelf);box(1.1,.07,.32,0,1.1,0,wood,shelf);
 for(const side of [-1,1])box(.055,1.13,.32,side*.54,.59,0,wood,shelf);
 const colors=[0x526455,0x784e36,0xb4a278,0x293e38,0x78644d];
 for(let row=0;row<2;row++)for(let i=0;i<11;i++){const h=.24+(i*7%6)*.018;const mat=new THREE.MeshStandardMaterial({color:colors[(i+row*2)%5],roughness:.85});const x=-.46+i*.085;box(.06,h,.21,x,.28+row*.43+h/2,-.005,mat,shelf);for(const yy of [-.065,.065])box(.062,.006,.006,x,.28+row*.43+h/2+yy,.105,bronze,shelf);}
 // Small brass desk lamp with a real shade and a pool of warm light.
 const lamp=new THREE.Group();lamp.position.set(.95,.03,-1.9);g.add(lamp);
 cyl(.15,.18,.045,0,.03,0,bronze,lamp);cyl(.009,.012,.72,0,.41,0,bronze,lamp);
 const shade=new THREE.Mesh(new THREE.SphereGeometry(.23,32,12,0,Math.PI*2,0,Math.PI/2),bronze);shade.position.set(0,.82,0);lamp.add(shade);const diff=cyl(.213,.213,.006,0,.821,0,glow,lamp);
 const light=new THREE.PointLight(0xffdda2,.55,3,2);light.position.set(.95,.77,-1.9);g.add(light);
 // A cartographer's side table: rolled charts and a small compass.
 const side=new THREE.Group();side.position.set(1.55,0,-2.6);side.rotation.y=-.1;g.add(side);
 box(1,.065,.56,0,.73,0,wood,side);for(const x of [-.43,.43])for(const z of [-.2,.2])box(.04,.7,.04,x,.35,z,bronze,side);
 const chart=box(.56,.004,.35,-.08,.766,0,VRDecor.material('parchment'),side);chart.rotation.y=.13;
 for(const z of [-.2,.2]){const scroll=cyl(.027,.027,.5,0,.79,z,cream,side);scroll.rotation.z=Math.PI/2;}
 const compass=cyl(.075,.075,.025,.3,.78,-.1,bronze,side);const needle=box(.006,.003,.1,.3,.796,-.1,glow,side);needle.rotation.y=.6;
 const soft=new THREE.PointLight(0xd4e4c4,.2,5,2);soft.position.set(-1.4,2.4,-1.2);g.add(soft);
 return {group:g,desk,update(t){g.visible=t<.12;}};
};
