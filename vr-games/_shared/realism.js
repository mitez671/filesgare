/* Local, shared scene dressing. Three r149; no network assets or animation timers.
   Decoration is never added to physics, picking, scoring or teleport targets. */
(function(global){
'use strict';
const BASE = new URL('realism/', document.currentScript.src).href;
let T, loader;
const maps = new Map(), materials = new Map();
const rough = {walnut:.46,parquet:.38,marble:.3,'persian-tile':.28,bronze:.4,velvet:1,acoustic:1,maple:.3,steel:.34,ice:.2,water:.16};
function texture(name, repeat=[1,1], data=false){
  const key=name+':'+repeat.join(',')+':'+data;
  if(maps.has(key)) return maps.get(key);
  const t=loader.load(BASE+name+'.jpg'); t.name=name; t.wrapS=t.wrapT=T.RepeatWrapping;
  t.repeat.set(...repeat);t.anisotropy=4;t.encoding=data?T.LinearEncoding:T.sRGBEncoding;
  maps.set(key,t);return t;
}
function material(name, repeat=[1,1], extra={}){
  const key=name+repeat.join(',')+JSON.stringify(extra);
  if(materials.has(key))return materials.get(key);
  const m=new T.MeshStandardMaterial(Object.assign({map:texture(name,repeat),normalMap:texture(name+'-normal',repeat,true),normalScale:new T.Vector2(.35,.35),roughness:rough[name]||.88,metalness:['bronze','steel'].includes(name)?.65:0},extra));
  materials.set(key,m);return m;
}
function mesh(g,mat,parent,x=0,y=0,z=0){const m=new T.Mesh(g,mat);m.position.set(x,y,z);parent.add(m);return m;}
function box(parent,w,h,d,x,y,z,mat){return mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z);}
function surface(m,name,repeat=[1,1],extra={}){m.material=material(name,repeat,extra);m.userData.realism=true;return m;}
function configure(three,renderer){T=three;loader=loader||new T.TextureLoader();
  renderer.outputEncoding=T.sRGBEncoding;
  // Keep original scene exposure and bright instructional panels readable.
  renderer.toneMapping=T.NoToneMapping;
}
function woodFrame(parent,w,h){
 const g=new T.Group();parent.add(g);g.name='Solid walnut frame with brass inlay';
 const wood=material('walnut',[1,2]),brass=material('bronze');
 for(const sx of [-1,1]){
  box(g,.075,h+.15,.095,sx*(w/2+.0375),0,.055,wood);
  box(g,.012,h+.025,.018,sx*(w/2+.006),0,.111,brass);
 }
 for(const sy of [-1,1]){
  const rail=box(g,w,.075,.095,0,sy*(h/2+.0375),.055,wood);rail.material=material('walnut',[2,.35]);
  box(g,w,.012,.018,0,sy*(h/2+.006),.111,brass);
 }
 box(g,w+.21,h+.21,.025,0,0,.012,material('walnut'));
 return g;
}
function lamp(parent,x,y,z){
 const g=new T.Group();g.position.set(x,y,z);parent.add(g);
 box(g,.15,.34,.08,0,0,0,material('bronze'));
 box(g,.08,.23,.09,0,0,.03,new T.MeshBasicMaterial({color:0xffd8a0}));
 return g;
}
function bench(parent,x,z){
 const g=new T.Group();g.name='Walnut slatted gallery bench';g.position.set(x,0,z);parent.add(g);
 for(let i=0;i<5;i++)box(g,2.3,.075,.095,0,.46,(i-2)*.115,material('walnut',[3,.2]));
 for(const sx of [-.88,.88]){box(g,.07,.43,.48,sx,.215,0,material('bronze'));}
 return g;
}
function galleryRoom(room,W,D,z0,H){
 const zb=z0-D, zc=(z0+zb)/2;
 const g=new T.Group();g.name='Gallery architectural details';room.add(g);
 for(const sx of [-1,1]){
  box(g,.08,.14,D,sx*(W/2-.04),H-.14,zc,material('travertine',[1,D/3]));
  box(g,.025,.025,D,sx*(W/2-.07),.2,zc,material('bronze'));
  for(let z=z0-2;z>zb+1;z-=4)lamp(g,sx*(W/2-.1),2.7,z).rotation.y=sx<0?Math.PI/2:-Math.PI/2;
 }
 for(let z=z0-3;z>zb+3;z-=W>20?12:6){if(W>20){bench(g,-W/2+2,z);bench(g,W/2-2,z);}else bench(g,0,z);}
}
function water(m){
 if(!m.material||m.material.isMeshBasicMaterial)return;
 const original=m.material;
 m.material=new T.MeshPhongMaterial({color:original.color||0x4b858a,normalMap:texture('water-normal',[6,16],true),normalScale:new T.Vector2(.14,.14),specular:0xbde3d4,shininess:100,transparent:original.transparent,opacity:original.opacity});
 m.userData.realism=true;
 // Offset only this scene's normal map, updated from the existing game loop.
 m.material.normalMap=m.material.normalMap.clone();m.material.normalMap.needsUpdate=true;
 return m.material.normalMap;
}
function leafAlpha(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 x.fillStyle='#000';x.fillRect(0,0,128,128);x.fillStyle='#fff';x.beginPath();x.moveTo(64,3);x.bezierCurveTo(122,39,116,83,64,125);x.bezierCurveTo(12,83,6,39,64,3);x.fill();
 return new T.CanvasTexture(c);
}
function nature(scene,id){
 const g=new T.Group();g.name='Layered forest: modeled branches, leaves, ferns and stones';scene.add(g);
 let seed=271828;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const dummy=new T.Object3D();
 // Leaf cards are placed in three dimensions, with actual depth and parallax.
 const leafMat=material('foliage',[1,1],{alphaMap:leafAlpha(),alphaTest:.5,side:T.DoubleSide,roughness:1});
 const count=id==='forest'?48:18, perTree=100;
 const leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1),leafMat,count*perTree);leaves.name='Instanced textured leaf canopy';g.add(leaves);
 const branches=new T.InstancedMesh(new T.CylinderGeometry(.6,1,1,7),material('bark',[1,2]),count*4);g.add(branches);
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2+rnd()*.3, radius=id==='forest'?12+rnd()*35:9+rnd()*14;
  let x=Math.cos(a)*radius,z=Math.sin(a)*radius;
  if(id==='forest'&&Math.abs(x-6)<3)x+=5;
  const h=5+rnd()*6, cy=h*.67;
  for(let b=0;b<4;b++){
   dummy.position.set(x+(b?Math.cos(b*2)*.45:0),b?cy:cy*.48,z+(b?Math.sin(b*2)*.45:0));
   dummy.rotation.set(b?.5:0,b*2,b?.35:0);dummy.scale.set(b?.13:.33,b?h*.36:cy,b?.13:.33);dummy.updateMatrix();branches.setMatrixAt(i*4+b,dummy.matrix);
  }
  for(let j=0;j<perTree;j++){
   const theta=rnd()*Math.PI*2,r=Math.sqrt(rnd())*(2.1+h*.1);
   dummy.position.set(x+Math.cos(theta)*r,cy+.5+rnd()*2.5,z+Math.sin(theta)*r);
   dummy.rotation.set(rnd()*2.8,rnd()*6.28,rnd()*6.28);dummy.scale.setScalar(.8+rnd()*.8);dummy.updateMatrix();leaves.setMatrixAt(i*perTree+j,dummy.matrix);
  }
 }
 // Three-dimensional fern leaflets combined into one geometry and instanced.
 const positions=[],uvs=[];
 for(let f=0;f<5;f++)for(let k=1;k<9;k++)for(const sign of [-1,1]){
  const a=f*Math.PI*2/5,t=k/9,l=(1-t)*.35+.025;
  const local=[[0,t*.5,t*.65],[sign*l,t*.5+.07,t*.65+.06],[sign*l*.8,t*.5+.015,t*.65+.17]];
  for(let j=0;j<3;j++){const [x,y,z]=local[j];positions.push(x*Math.cos(a)+z*Math.sin(a),y,-x*Math.sin(a)+z*Math.cos(a));uvs.push(j===1?1:0,j===2?1:0);}
 }
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(positions,3));fg.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));fg.computeVertexNormals();
 const fernCount=id==='forest'?380:100;
 const ferns=new T.InstancedMesh(fg,material('foliage',[1,1],{side:T.DoubleSide}),fernCount);g.add(ferns);
 for(let i=0;i<fernCount;i++){
  let x=(rnd()-.5)*(id==='forest'?70:34),z=(rnd()-.5)*(id==='forest'?70:34);
  if(Math.hypot(x,z)<3.5||(id==='forest'&&Math.abs(x-6)<2.2))x+=9;
  dummy.position.set(x,.02,z);dummy.rotation.set(0,rnd()*6.28,0);dummy.scale.setScalar(.6+rnd()*1.1);dummy.updateMatrix();ferns.setMatrixAt(i,dummy.matrix);
 }
 const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),material('granite'),42);g.add(rocks);
 for(let i=0;i<42;i++){
  let x=(rnd()-.5)*30,z=(rnd()-.5)*30;if(Math.hypot(x,z)<4)x+=6;
  if(id==='forest'&&i<24)x=6+(i%2?1:-1)*(1.65+rnd()*.45);
  dummy.position.set(x,.08,z);dummy.rotation.set(rnd(),rnd()*6,rnd());dummy.scale.set(.2+rnd()*.5,.15+rnd()*.25,.25+rnd()*.5);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
 }
 const pano=mesh(new T.SphereGeometry(id==='forest'?145:90,48,24),new T.MeshBasicMaterial({map:texture('forest-panorama'),side:T.BackSide,fog:false}),g,0,1.6,0);pano.name='Generated forest photographic panorama';pano.material.map.wrapS=pano.material.map.wrapT=T.ClampToEdgeWrapping;
 return {group:g,panorama:pano};
}
function cinema(scene){
 const g=new T.Group();g.name='Cinema velvet drapery, acoustic panels and aisle details';scene.add(g);
 // Curved continuous fabric folds, replacing flat curtain cards.
 for(const sx of [-1,1]){
  const geo=new T.PlaneGeometry(3.2,7,64,1),p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setZ(i,Math.cos(p.getX(i)*Math.PI*7)*.095);geo.computeVertexNormals();
  mesh(geo,material('velvet',[3,3],{side:T.DoubleSide}),g,sx*6.2,3.5,-8.7);
  for(let z=-6;z<8;z+=2.5){box(g,.08,2,1.4,sx*7.86,3,z,material('acoustic',[1,2]));lamp(g,sx*7.7,3,z).rotation.y=sx<0?Math.PI/2:-Math.PI/2;}
  for(let r=0;r<7;r++){
   box(g,.055,.035,1.1,sx*4.25,r*.18+.06,-5+r*1.2,new T.MeshBasicMaterial({color:0xe5a04c}));
   box(g,1.05,.16,1.16,sx*4.6,r*.18-.08,-5+r*1.2,material('acoustic'));
  }
 }
 // Upholstered armrests, brass cup holders and seat legs.
 const seats=scene.children.filter(o=>o.isGroup&&o.children.length===2&&o.children[0].geometry?.parameters.width===.6);
 const arms=new T.InstancedMesh(new T.BoxGeometry(.09,.1,.56),material('walnut'),seats.length*2);
 const cups=new T.InstancedMesh(new T.TorusGeometry(.035,.009,6,12),material('bronze'),seats.length*2);
 const legs=new T.InstancedMesh(new T.BoxGeometry(.35,.16,.35),material('bronze'),seats.length);
 const d=new T.Object3D();
 seats.forEach((seat,i)=>{
  for(let j=0;j<2;j++){
   const sx=j?1:-1;d.position.copy(seat.position).add(new T.Vector3(sx*.32,.49,.02));d.rotation.set(0,0,0);d.updateMatrix();arms.setMatrixAt(i*2+j,d.matrix);
   d.position.copy(seat.position).add(new T.Vector3(sx*.32,.55,-.17));d.rotation.set(-Math.PI/2,0,0);d.updateMatrix();cups.setMatrixAt(i*2+j,d.matrix);
  }
  d.position.copy(seat.position).add(new T.Vector3(0,.08,.03));d.rotation.set(0,0,0);d.updateMatrix();legs.setMatrixAt(i,d.matrix);
 });g.add(arms,cups,legs);
}
// Conservative classification for existing untextured physical surfaces.
// Colored targets, emissive game pieces, UI, mapped artwork and glass are excluded.
function enhance(scene,id){
 const hsl={};let changed=0;
 const outdoor=['forest','fishing','golf','goalkeeper','archery','castle','coaster','balloons','slingshot','poetry','daynight','seasons','weather','drone'];
 const indoorSport=['basket','bowling','pingpong','hockey','boxing','darts','dodge','juggle','reflex'];
 const music=['piano','santur','drums','radio','visualizer'];
 const floorKind=id==='moon'?'lunar':id==='mars'?'mars':id==='snowball'?'snow':id==='hockey'?'ice':id==='deepsea'||id==='aquarium'?'sand':id==='zen'?'moss':outdoor.includes(id)?'grass':indoorSport.includes(id)?'maple':music.includes(id)?'parquet':['iss','robot','flights','race','plank'].includes(id)?'steel':'travertine';
 scene.traverse(o=>{
  const m=o.material,p=o.geometry?.parameters;
  if(!o.isMesh||!p||!m||!m.color||m.isShaderMaterial||Array.isArray(m)||m.transparent||o.userData.realism||o.userData.onClick)return;
  const waterLike=m.isMeshPhongMaterial&&m.shininess>=25&&m.color.b>m.color.r;
  if(waterLike)return;
  const isFloor=(o.geometry.type==='PlaneGeometry'||o.geometry.type==='CircleGeometry')&&Math.abs(Math.abs(o.rotation.x)-Math.PI/2)<.02&&((p.width>3&&p.height>3)||p.radius>2);
  if(isFloor&&id!=='cinema'){
   if(m.map){
    // Preserve original court lines, runway markings and drawn sand patterns.
    if(!m.isMeshBasicMaterial){m.bumpMap=texture(floorKind,[Math.min(120,(p.width||p.radius*2)/2),Math.min(120,(p.height||p.radius*2)/2)],true);m.bumpScale=.012;m.needsUpdate=true;changed++;}return;
   }
   // keep the scene's own floor colour (dark arenas stay dark) and avoid mirror-like glare on huge floors
   const natural=['grass','sand','snow','lunar','mars','moss'].includes(floorKind);
   // dark arena floors: neutral polished stone in the scene's own colour instead of orange wood or beige stone
   const fk=(!natural&&m.color.getHSL({}).l<.3)?'granite':floorKind;const tint=natural?new T.Color(1,1,1):m.color.clone().lerp(new T.Color(1,1,1),.15);const tl=tint.getHSL({}).l;if(tl<.14)tint.offsetHSL(0,0,.14-tl);
   surface(o,fk,[Math.max(1,Math.min(120,(p.width||p.radius*2)/2)),Math.max(1,Math.min(120,(p.height||p.radius*2)/2))],{color:tint,roughness:Math.max(rough[fk]||.88,.62)});changed++;return;
  }
  if(m.map||m.isMeshBasicMaterial||m.emissiveIntensity>.15)return;
  m.color.getHSL(hsl);const {h,s,l}=hsl;
  const w=p.width||0,ht=p.height||0,depth=p.depth||0,r=p.radius||p.radiusBottom||0;
  let name=null,rep=[1,1];
  if(h>.18&&h<.45&&s>.12&&s<.8&&(w>8||r>.6)){name='moss';rep=[Math.min(24,w/2||r),Math.min(24,ht/2||r)];}
  else if(h>.035&&h<.13&&s>.18&&s<.72&&l<.65&&(o.geometry.type==='BoxGeometry'||o.geometry.type==='CylinderGeometry')){name=o.geometry.type==='CylinderGeometry'&&ht>1.4?'bark':'walnut';rep=[Math.max(1,w/2),Math.max(1,ht/2)];}
  else if(s<.14&&l>.23&&l<.68&&(o.geometry.type.includes('Dodecahedron')||o.geometry.type.includes('Icosahedron'))){name='granite';}
  else if(['castle','build','towers','tower'].includes(id)&&s<.25&&(w>1||r>1)&&ht>1){name='masonry';rep=[Math.max(1,w/2||r),Math.max(1,ht/2)];}
  if(name){surface(o,name,rep,{side:m.side});changed++;}
 });
 return changed;
}
// Primitive trees (green cones / green blobs) → leaf-card trees with bark trunks, built at the same size and place.
const NO_TREES=['shapes','molecules','build','stacker','simon','rubik','memory','connect4','dooz','towers','tower','aquarium','deepsea','galaxy','solar','periodic','balloons','juggle','wizard','paint','clay'];
function collectTrees(scene,id){
 const out=[];if(NO_TREES.includes(id))return out;
 const hsl={},box=new T.Box3(),sz=new T.Vector3(),c=new T.Vector3();
 scene.updateMatrixWorld(true);
 scene.traverse(o=>{
  const m=o.material,t=o.geometry?.type;if(!o.isMesh||!m||!m.color||Array.isArray(m)||m.transparent||m.map||o.userData.onClick||!o.visible)return;
  const cone=t==='ConeGeometry',blob=t==='SphereGeometry'||t==='IcosahedronGeometry'||t==='DodecahedronGeometry';if(!cone&&!blob)return;
  m.color.getHSL(hsl);if(!(hsl.h>.17&&hsl.h<.46&&hsl.s>.15&&hsl.l<.7))return;
  box.setFromObject(o);box.getSize(sz);box.getCenter(c);
  if(cone&&sz.y>=1.2&&sz.y<40&&Math.max(sz.x,sz.z)<sz.y*1.2)out.push({o,kind:'pine',x:c.x,z:c.z,y:box.min.y,h:sz.y,w:Math.max(sz.x,sz.z)});
  else if(blob&&Math.max(sz.x,sz.y,sz.z)>=.9&&Math.max(sz.x,sz.y,sz.z)<=8)out.push({o,kind:'broad',x:c.x,z:c.z,y:c.y,h:sz.y,w:Math.max(sz.x,sz.z)});
 });
 return out;
}
function leafyTrees(scene,list){
 if(!list.length)return null;
 const g=new T.Group();g.name='Leaf-card trees replacing primitive cones and blobs';scene.add(g);
 let seed=91573;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const d=new T.Object3D(),alpha=leafAlpha();
 const mats={pine:material('foliage',[1,1],{alphaMap:alpha,alphaTest:.5,side:T.DoubleSide,roughness:1,color:new T.Color(0x7d9c68)}),broad:material('foliage',[1,1],{alphaMap:alpha,alphaTest:.5,side:T.DoubleSide,roughness:1})};
 for(const kind of ['pine','broad']){
  const L=list.filter(t=>t.kind===kind);if(!L.length)continue;
  // keep the whole forest within ~12k leaf cards so Quest frame rates hold
  const per=Math.max(90,Math.min(kind==='pine'?240:260,Math.floor(12000/L.length)));
  const leaves=new T.InstancedMesh(new T.PlaneGeometry(1,1),mats[kind],L.length*per);g.add(leaves);
  const trunks=new T.InstancedMesh(new T.CylinderGeometry(.55,1,1,8),material('bark',[1,3]),L.length);g.add(trunks);
  L.forEach((t,i)=>{
   t.o.visible=false;
   if(kind==='pine'){
    const th=t.h*.92,tr=Math.max(.06,t.w*.05);d.position.set(t.x,t.y+th/2,t.z);d.rotation.set(0,0,0);d.scale.set(tr,th,tr);d.updateMatrix();trunks.setMatrixAt(i,d.matrix);
    const ls=Math.min(1.3,Math.max(.34,t.h*.12));
    for(let j=0;j<per;j++){const f=Math.pow(rnd(),.8),y=t.y+t.h*(.16+.84*f),R=t.w*.5*(1-f)*(.75+.35*rnd())+.05,a=rnd()*6.283;
     d.position.set(t.x+Math.cos(a)*R,y-ls*.2,t.z+Math.sin(a)*R);d.rotation.set(-.9+rnd()*.5,a+Math.PI/2,(rnd()-.5)*.6);d.scale.setScalar(ls*(.8+rnd()*.5));d.updateMatrix();leaves.setMatrixAt(i*per+j,d.matrix);}
   }else{
    const R=t.w*.5,cy=t.y,base=cy-t.h*.5;
    // trunk only from the crown's bottom down to the ground plane under it (y=0) when the blob floats above it
    const th=Math.max(0,base+R*.4);d.position.set(t.x,th/2,t.z);d.rotation.set(0,0,0);d.scale.set(Math.max(.05,R*.12),Math.max(.001,th),Math.max(.05,R*.12));d.updateMatrix();trunks.setMatrixAt(i,d.matrix);
    const ls=Math.min(.9,Math.max(.26,R*.24));
    for(let j=0;j<per;j++){const u=rnd()*2-1,a=rnd()*6.283,k=Math.cbrt(.55+.45*rnd()),q=Math.sqrt(1-u*u);
     d.position.set(t.x+Math.cos(a)*q*R*k,cy+u*t.h*.5*k,t.z+Math.sin(a)*q*R*k);d.rotation.set(rnd()*2.8,rnd()*6.28,rnd()*6.28);d.scale.setScalar(ls*(.75+rnd()*.6));d.updateMatrix();leaves.setMatrixAt(i*per+j,d.matrix);}
   }
  });
  leaves.instanceMatrix.needsUpdate=trunks.instanceMatrix.needsUpdate=true;leaves.frustumCulled=trunks.frustumCulled=false;
 }
 return g;
}
function apply(engine,id){
 configure(global.THREE,engine.renderer);
 const scene=engine.scene;
 if(scene.userData.realismApplied)return;
 scene.userData.realismApplied=true;
 const treeList=collectTrees(scene,id);
 const count=enhance(scene,id);let decor=null;
 if(!['forest','zen'].includes(id))leafyTrees(scene,treeList);
 if(['forest','zen'].includes(id)){
  if(id==='forest'){
   // Original low-detail canopy is replaced by leaf geometry at actual depth.
   scene.children.filter(o=>o.isGroup&&o.children[0]?.geometry?.type==='CylinderGeometry'&&o.children[0].geometry.parameters.height>2).forEach(o=>{scene.remove(o);o.traverse(c=>{if(c.geometry)c.geometry.dispose();});});
  }
  decor=nature(scene,id);scene.userData.natureDecor=decor;
 }
 if(id==='cinema')cinema(scene);
 const waters=[];
 scene.traverse(o=>{if(o.isMesh&&o.material?.isMeshPhongMaterial&&((o.geometry?.type==='PlaneGeometry'&&o.geometry.parameters.width>1&&o.geometry.parameters.height>10)||(o.geometry?.type==='CircleGeometry'&&o.geometry.parameters.radius>1))){const t=water(o);if(t)waters.push(t);}});
 // K and A have different update signatures. This hook is attached by the initializer.
 engine.realismUpdate=function(dt){for(const t of waters){t.offset.x=(t.offset.x+dt*.011)%1;t.offset.y=(t.offset.y+dt*.006)%1;}};
 scene.userData.realism={version:1,texturedMeshes:count,theme:id};
}
global.VRDecor={configure,texture,material,surface,woodFrame,galleryRoom,bench,apply,BASE};
})(window);
