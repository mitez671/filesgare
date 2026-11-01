/* Gallery 02: geometry for the Quiet Light exhibition. No shared game changes. */
window.GalleryCraft=(function(){
 const T=THREE;
 const mat=(n,r=[1,1],extra={})=>VRDecor.material(n,r,extra);
 function box(parent,w,h,d,x,y,z,m){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);parent.add(o);return o;}
 function archShape(w,base,spring){const s=new T.Shape();s.moveTo(-w/2,base);s.lineTo(-w/2,spring);s.absarc(0,spring,w/2,Math.PI,0,true);s.lineTo(w/2,base);s.closePath();return s;}
 function shadow(parent,w,d,x,y,z,rotation=-Math.PI/2){
  const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),g=q.createRadialGradient(64,64,8,64,64,64);g.addColorStop(0,'rgba(32,22,12,.28)');g.addColorStop(.55,'rgba(32,22,12,.12)');g.addColorStop(1,'rgba(32,22,12,0)');q.fillStyle=g;q.fillRect(0,0,128,128);
  const m=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.rotation.x=rotation;m.position.set(x,y,z);parent.add(m);return m;
 }
 function frame(parent,w,h){
  const mount=.135,innerW=w+mount*2,innerH=h+mount*2,outerW=innerW+.14,outerH=innerH+.14;
  const shape=new T.Shape();shape.moveTo(-outerW/2,-outerH/2);shape.lineTo(outerW/2,-outerH/2);shape.lineTo(outerW/2,outerH/2);shape.lineTo(-outerW/2,outerH/2);shape.closePath();
  const hole=new T.Path();hole.moveTo(-innerW/2,-innerH/2);hole.lineTo(-innerW/2,innerH/2);hole.lineTo(innerW/2,innerH/2);hole.lineTo(innerW/2,-innerH/2);hole.closePath();shape.holes.push(hole);
  const wood=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:true,bevelSize:.008,bevelThickness:.009,bevelSegments:2,steps:1}),mat('walnut',[1.3,1.3],{roughness:.42}));wood.position.z=.025;wood.castShadow=true;parent.add(wood);
  box(parent,innerW,innerH,.02,0,0,.041,new T.MeshStandardMaterial({color:0xf0eadc,roughness:1}));
  const brass=mat('bronze',[1,1],{color:0xc5a565,roughness:.45});
  for(const sx of [-1,1])box(parent,.006,innerH,.007,sx*(innerW/2-.002),0,.097,brass);
  for(const sy of [-1,1])box(parent,innerW,.006,.007,0,sy*(innerH/2-.002),.097,brass);
  // Wall stand-off and shallow contact shadow: the frame never looks pasted on.
  const sh=shadow(parent,outerW+.22,outerH+.22,0,-.025,.007,0);sh.material.opacity=.48;
  return {front:.062,outerW,outerH};
 }
 function pictureLight(parent,w,h){
  const bronze=mat('bronze',[1,1],{color:0xc5a565});
  box(parent,.045,.11,.035,0,h/2+.35,.03,bronze);
  box(parent,.022,.022,.22,0,h/2+.39,.12,bronze);
  const lamp=box(parent,w*.58,.035,.065,0,h/2+.37,.24,bronze);
  box(parent,w*.54,.008,.055,0,h/2+.349,.24,new T.MeshBasicMaterial({color:0xffe9bd}));
  // Subtle illumination patch on plaster, without rendering a cone into the air.
  const c=document.createElement('canvas');c.width=128;c.height=256;const x=c.getContext('2d');const q=x.createRadialGradient(64,40,2,64,110,132);q.addColorStop(0,'rgba(255,226,167,.2)');q.addColorStop(.65,'rgba(255,226,167,.06)');q.addColorStop(1,'rgba(255,226,167,0)');x.fillStyle=q;x.fillRect(0,0,128,256);
  const wash=new T.Mesh(new T.PlaneGeometry(w+1,h+1.4),new T.MeshBasicMaterial({map:new T.CanvasTexture(c),transparent:true,depthWrite:false}));wash.position.set(0,.12,.004);parent.add(wash);
 }
 function architecture(room,W,D,z0,H){
  const g=new T.Group();g.name='Quiet Light · plaster, travertine, walnut and brass';room.add(g);const zb=z0-D,zc=(zb+z0)/2;
  const stone=mat('travertine',[2,1],{color:0xe8dfcb,roughness:.85}),trim=new T.MeshStandardMaterial({color:0xe4d6b8,roughness:.85}),brass=mat('bronze',[1,1],{color:0xc6ac75,roughness:.47});
  // Wainscot, fine shadow gaps and light-colored cornices.
  for(const sx of [-1,1]){
   box(g,.055,.72,D,sx*(W/2-.03),.36,zc,stone);
   box(g,.075,.035,D,sx*(W/2-.05),.735,zc,brass);
   box(g,.11,.13,D,sx*(W/2-.06),H-.2,zc,trim);
   box(g,.17,.035,D,sx*(W/2-.09),H-.29,zc,trim);
   for(let z=z0-1.5;z>zb+.8;z-=3.1){box(g,.14,H-.42,.14,sx*(W/2-.13),(H-.42)/2,z,trim);box(g,.22,.1,.22,sx*(W/2-.13),.06,z,stone);}
  }
  box(g,W,.7,.04,0,.35,zb+.025,stone);box(g,W,.032,.065,0,.72,zb+.04,brass);
  box(g,W,.13,.15,0,H-.2,zb+.06,trim);
  // Fine brass floor inlay follows the room, avoiding the walking route.
  for(const sx of [-1,1])box(g,.008,.002,D-.9,sx*(W/2-.43),.006,zc,brass);
  box(g,W-.85,.002,.008,0,.006,zb+.43,brass);
  // Repeated ceiling ribs with a gentle vault, giving the room a silhouette.
  for(let z=z0-.7;z>zb+.4;z-=2.6){
   const pts=[];for(let j=0;j<=48;j++){const x=-W/2+j/48*W,y=H-.29+.22*Math.sin(j/48*Math.PI);pts.push(new T.Vector3(x,y,z));}
   g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,.028,5,false),trim));
  }
  // Arched clerestory on the left: glass, a stone reveal and narrow mullions.
  for(let z=z0-1.2;z>zb+1.7;z-=2.8){
   const window=new T.Group();window.position.set(-W/2+.035,3.08,z);window.rotation.y=Math.PI/2;g.add(window);
   const sh=archShape(1.28,-.38,.34),opening=new T.Mesh(new T.ShapeGeometry(sh),new T.MeshBasicMaterial({color:0xe5eee0}));opening.position.z=.006;window.add(opening);
   const curve=[];curve.push(new T.Vector3(-.67,-.42,.02),new T.Vector3(-.67,.34,.02));for(let i=0;i<=32;i++){const a=Math.PI-i/32*Math.PI;curve.push(new T.Vector3(Math.cos(a)*.67,.34+Math.sin(a)*.67,.02));}curve.push(new T.Vector3(.67,-.42,.02));
   window.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(curve),64,.045,6,false),trim));
   box(window,.025,1.35,.05,0,.2,.06,brass);box(window,1.27,.022,.05,0,.23,.06,brass);
  }
  // Light through windows: soft transparent projected patches, resting on the floor.
  const sunlight=new T.MeshBasicMaterial({color:0xffedbc,transparent:true,opacity:.1,depthWrite:false});
  for(let k=0;k<3;k++){const patch=new T.Mesh(new T.PlaneGeometry(2.4,1.05),sunlight);patch.rotation.set(-Math.PI/2,0,-.45);patch.position.set(-W/2+2.25,.009,zc+1.4-k*2.7);g.add(patch);}
  // A slatted sculptural bench with a recessed leather seat.
  const bench=new T.Group();bench.position.set(.1,0,zc+1.25);g.add(bench);
  const wood=mat('walnut',[2,.4]);for(let i=0;i<7;i++)box(bench,2.35,.055,.067,0,.45,(i-3)*.075,wood);
  for(const sx of [-.9,.9]){box(bench,.09,.4,.44,sx,.2,0,brass);box(bench,.3,.045,.5,sx,.035,0,wood);}
  shadow(g,3.1,1.3,.1,.021,zc+1.25);
  // Original bronze sculpture: two interlocking, tilted rings on a stone plinth.
  const sculpture=new T.Group();sculpture.position.set(-W/2+.68,0,zc+.15);g.add(sculpture);
  box(sculpture,.68,.88,.68,0,.44,0,stone);box(sculpture,.72,.035,.72,0,.9,0,trim);
  for(const sd of [-1,1]){const loop=new T.Mesh(new T.TorusGeometry(.3,.047,12,64),brass);loop.position.set(sd*.12,1.25,0);loop.rotation.set(.4,sd*.6,sd*.2);sculpture.add(loop);}
  shadow(g,1.3,1.1,-W/2+.68,.008,zc+.15);
  // Olive trees with individually shaped leaves, instanced for VR.
  const leafShape=new T.Shape();leafShape.moveTo(0,-.5);leafShape.quadraticCurveTo(.2,0,0,.5);leafShape.quadraticCurveTo(-.2,0,0,-.5);const lg=new T.ShapeGeometry(leafShape),lm=new T.MeshStandardMaterial({color:0x6c7650,roughness:.9,side:T.DoubleSide});
  const leaves=new T.InstancedMesh(lg,lm,240),d=new T.Object3D();g.add(leaves);
  for(let side=0;side<2;side++){
   const x=(side?1:-1)*(W/2-.7),z=z0-1.15;
   const pot=new T.Mesh(new T.CylinderGeometry(.23,.17,.47,28),mat('clay',[1,1],{color:0xcdac85}));pot.position.set(x,.235,z);g.add(pot);
   const soil=new T.Mesh(new T.CircleGeometry(.21,24),new T.MeshStandardMaterial({color:0x352b1f,roughness:1}));soil.rotation.x=-Math.PI/2;soil.position.set(x,.472,z);g.add(soil);
   const trunk=new T.Mesh(new T.CylinderGeometry(.013,.026,1.1,8),mat('bark'));trunk.position.set(x,.98,z);g.add(trunk);
   for(let i=0;i<120;i++){const a=i*2.399963,r=.12+((i*17)%101)/101*.37,y=1.13+((i*31)%101)/101*.72;d.position.set(x+Math.cos(a)*r,y,z+Math.sin(a)*r);d.rotation.set(i*.4,i*.7,i*.23);d.scale.set(.1,.19,.1);d.updateMatrix();leaves.setMatrixAt(side*120+i,d.matrix);}
   shadow(g,.95,.95,x,.008,z);
  }
  return g;
 }
 function rug(parent,W,D,z0){
  const group=new T.Group();group.name='Persian medallion rug · wool pile, bound edges and cotton fringe';parent.add(group);
  const width=3.2,length=Math.min(4.8,D-3),z=(2*z0-D)/2-.6;
  group.position.set(0,0,z);
  const diffuse=new T.TextureLoader().load('art/materials/persian-medallion-rug.jpg?v=20261101');diffuse.encoding=T.sRGBEncoding;diffuse.anisotropy=8;diffuse.wrapS=diffuse.wrapT=T.ClampToEdgeWrapping;
  // Fine periodic knot relief is independent of the printed ornament, avoiding deep carved motifs.
  const n=128,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=(y*n+x)*4,v=145+Math.round(24*Math.cos(x*Math.PI/2)*Math.cos(y*Math.PI/2)+10*Math.sin((x+y)*Math.PI/2));data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;}
  const weave=new T.DataTexture(data,n,n,T.RGBAFormat);weave.needsUpdate=true;weave.magFilter=T.LinearFilter;weave.minFilter=T.LinearFilter;weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(36,54);
  const backing=new T.MeshStandardMaterial({color:0x30262a,roughness:1});
  box(group,width,.012,length,0,.012,0,backing);
  const geo=new T.PlaneGeometry(width,length,24,36);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),zz=pos.getZ(i);pos.setY(i,.0187+.00025*Math.sin(x*17)*Math.cos(zz*13));}geo.computeVertexNormals();
  const top=new T.Mesh(geo,new T.MeshStandardMaterial({map:diffuse,bumpMap:weave,bumpScale:.00065,roughness:1,metalness:0}));top.name='Complete single rug pattern, no tiling';group.add(top);
  const bound=new T.MeshStandardMaterial({color:0x282d38,roughness:1});
  for(const sx of [-1,1])box(group,.01,.012,length,sx*(width/2+.002),.014,0,bound);
  for(const sz of [-1,1])box(group,width,.012,.009,0,.014,sz*(length/2+.002),bound);
  // Actual fringe geometry at both short ends, drawn as a single instanced mesh.
  const threads=104,fringe=new T.InstancedMesh(new T.CylinderGeometry(.0013,.0016,.075,4),new T.MeshStandardMaterial({color:0xe3d4af,roughness:1}),threads*2),dummy=new T.Object3D();
  fringe.name='Hand knotted cotton fringe';group.add(fringe);
  for(let side=0;side<2;side++)for(let i=0;i<threads;i++){
   const sd=side?1:-1;dummy.position.set(-width/2+.025+i*(width-.05)/(threads-1),.012,sd*(length/2+.039));dummy.rotation.set(Math.PI/2,0,Math.sin(i*2.4)*.09);dummy.scale.set(1,.86+((i*13)%17)/50,1);dummy.updateMatrix();fringe.setMatrixAt(side*threads+i,dummy.matrix);
  }
  shadow(group,width+.19,length+.2,0,.0055,0);
  group.userData={width,length,thickness:.012,fringeCount:threads*2};return group;
 }
 return {architecture,frame,pictureLight,rug};
})();
