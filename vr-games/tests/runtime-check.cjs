// Runs actual Three.js scene construction and updates with a mocked DOM/GPU boundary.
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
function dom(){
 const gradient={addColorStop(){}};const ctx=new Proxy({measureText:t=>({width:String(t).length*19}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,getImageData:()=>({data:new Uint8ClampedArray(256*256*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>k in o?o[k]:(()=>{})});
 const els=new Map();let doc;
 class El{constructor(tag='div'){this.tagName=tag.toUpperCase();this.style={setProperty(){}};this.dataset={};this.classList={add(){},remove(){},toggle(){}};this.children=[];this.width=512;this.height=512;this.hidden=false;this.value='';this.files=[];this.paused=true;this.ownerDocument=doc;this.complete=true;this.naturalWidth=512;this.naturalHeight=512;}
 getContext(){return ctx;}addEventListener(){}removeEventListener(){}setAttribute(){}removeAttribute(){}appendChild(e){this.children.push(e);return e;}append(...e){this.children.push(...e);}after(){}remove(){}focus(){}click(){}querySelector(s){return doc.querySelector(s);}querySelectorAll(){return [];}getBoundingClientRect(){return {left:0,top:0,width:1440,height:900};}setPointerCapture(){}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}load(){}get outerHTML(){return '';}get src(){return this._src||'';}set src(v){this._src=v;} }
 doc={createTextNode:t=>({textContent:t}),createElement:t=>new El(t),createElementNS:(_,t)=>new El(t),getElementById:id=>{if(!els.has(id))els.set(id,new El());return els.get(id);},querySelector:s=>{if(!els.has(s))els.set(s,new El());return els.get(s);},querySelectorAll:()=>[],fonts:{load:()=>Promise.resolve([]),ready:Promise.resolve()},addEventListener(){},documentElement:new El(),head:new El(),body:new El(),currentScript:{src:'http://localhost/vr-games/_shared/realism.js'}};
 return {doc,El};
}
async function run(id){
 const {doc,El}=dom();const loops=[];let asyncErrors=[];
 const ctx={console:{...console,warn(){}},document:doc,location:{href:'http://localhost/vr-games/'+id+'/',protocol:'http:',search:'',hostname:'localhost'},innerWidth:1440,innerHeight:900,devicePixelRatio:1,navigator:{userAgent:'test',getGamepads:()=>[]},screen:{},URL,URLSearchParams,TextDecoder,TextEncoder,ArrayBuffer,Uint8Array,Float32Array,performance,Blob,Event:class{},Image:El,Audio:El,ImageData:class{},addEventListener(){},removeEventListener(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},fetch:async u=>{let local=path.resolve(ROOT,id,String(u));if(String(u).includes('://'))throw Error('Offline external service');if(!fs.existsSync(local))return {ok:false,status:404,json:async()=>({}),text:async()=>''};return {ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(local,'utf8')),text:async()=>fs.readFileSync(local,'utf8')};},localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:false,addEventListener(){}}),alert(){}};
 const param={value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
 const audioNode=()=>new Proxy({connect(){return audioNode();},disconnect(){},start(){},stop(){},setPeriodicWave(){}},{get:(o,k)=>k in o?o[k]:{...param}});
 ctx.AudioContext=class{constructor(){this.currentTime=0;this.sampleRate=44100;this.destination=audioNode();}resume(){return Promise.resolve();}createGain(){return audioNode();}createOscillator(){return audioNode();}createBufferSource(){return audioNode();}createBiquadFilter(){return audioNode();}createDynamicsCompressor(){return audioNode();}createStereoPanner(){return audioNode();}createAnalyser(){return {...audioNode(),frequencyBinCount:128,getByteFrequencyData(){}};}createBuffer(){return {getChannelData:()=>new Float32Array(44100),length:44100,duration:1};}createPeriodicWave(){return {};}};
 ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(ROOT+'/_shared/three-r149.js','utf8'),ctx);
 const T=ctx.THREE;
 T.WebGLRenderer=class{constructor(){this.domElement=new El('canvas');this.xr={enabled:false,isPresenting:false,setReferenceSpaceType(){},getController:()=>new T.Group(),getControllerGrip:()=>new T.Group(),addEventListener(){},getSession:()=>null};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.info={render:{}};}setSize(){}setPixelRatio(){}setAnimationLoop(f){loops.push(f);}render(s,c){ctx.__lastScene=s;s.updateMatrixWorld();c.updateMatrixWorld();}getSize(v){return v.set(1440,900);}};
 T.TextureLoader.prototype.load=function(u,onload){const t=new T.Texture({width:512,height:512});if(onload)Promise.resolve().then(()=>onload(t));return t;};
 vm.runInContext(fs.readFileSync(ROOT+'/_shared/realism.js','utf8'),ctx);
 if(['tower','slingshot'].includes(id))vm.runInContext(fs.readFileSync(ROOT+'/_shared/cannon-0.6.2.js','utf8'),ctx);
 if(id==='map')vm.runInContext(fs.readFileSync(ROOT+'/map/atlas-room.js','utf8'),ctx);
 if(id==='museum')vm.runInContext(fs.readFileSync(ROOT+'/museum/gallery-room.js','utf8'),ctx);
 const html=fs.readFileSync(ROOT+'/'+id+'/index.html','utf8');
 for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
  if(m[1].includes('src=')||m[1].includes('importmap')||m[1].includes('application/ld'))continue;
  let code=m[2];if(m[1].includes('module')){
   code=code.replace(/^import .*;$/gm,'');ctx.GLTFLoader=class{setDRACOLoader(){}load(){}};ctx.DRACOLoader=class{setDecoderPath(){}setDecoderConfig(){}preload(){}};
  }
  vm.runInContext(code,ctx,{filename:id+'/index.html',timeout:20000});
 }
 for(let i=0;i<12;i++)await Promise.resolve();
 const E=ctx.K||ctx.A;
 if(id==='museum'){for(let i=0;i<20;i++)await Promise.resolve();const M=ctx.__museum;if(M.paintings.length!==4)throw Error('Curated gallery must contain four frames');M.startDesk();M.focusArtwork(1);if(M.focusedArt!==0)throw Error('Next artwork navigation failed');M.focusArtwork(-1);if(M.focusedArt!==3)throw Error('Previous artwork wrapping failed');if(!M.rig.position.toArray().every(Number.isFinite))throw Error('Invalid gallery viewpoint');M.showLobby();}
 if(E){E.mode='desk';if(E.cfg?.reset)E.cfg.reset(E);if(E.cfg?.modes&&E.cfg.start){E.cfg.start(E.cfg.modes[0].key,E);E.state='play';}}
 if(id==='forest'){
   const menu=E.cfg.menu();menu[0].act();if(E.scene.userData.natureDecor.panorama.visible)throw Error('Night panorama remains visible');
   menu[3].act();if(E.scene.userData.forestGround.material.map.name!=='snow')throw Error('Snow ground not applied');
   menu[0].act();menu[1].act();if(!E.scene.userData.natureDecor.panorama.visible)throw Error('Clear day panorama missing');
 }
 if(id==='fishing'){
   const lake=E.scene.children.find(o=>o.geometry?.parameters?.width===200&&o.geometry?.parameters?.height===200);
   if(!lake?.material.isMeshPhongMaterial||!lake.material.normalMap)throw Error('Lake lost water material');
 }
 for(let i=0;i<5;i++)for(const f of loops)f();
 let nodes=0,meshes=0,triangles=0,invalid=0;
 const scene=E?.scene||ctx.__lastScene||vm.runInContext('typeof scene!=="undefined"?scene:null',ctx);
 scene?.traverse(o=>{nodes++;if(o.isMesh){meshes++;const pos=o.geometry?.attributes.position;if(pos){const count=o.geometry.index?.count||pos.count;triangles+=count/3*(o.count||1);for(let i=0;i<Math.min(pos.array.length,30);i++)if(!Number.isFinite(pos.array[i]))invalid++;}}});
 if(invalid)throw Error('Nonfinite geometry: '+invalid);
 return {id,nodes,meshes,triangles:Math.round(triangles),textures:scene?.userData.realism?.texturedMeshes||0};
}
(async()=>{
 const ids=process.argv.slice(2);const all=ids.length?ids:fs.readdirSync(ROOT).filter(n=>n!=='hello-webxr'&&fs.existsSync(ROOT+'/'+n+'/index.html'));
 let fail=0,results=[];for(const id of all){try{const r=await run(id);results.push(r);console.log('PASS',JSON.stringify(r));}catch(e){fail++;console.log('FAIL',id,e.stack);}}
 fs.writeFileSync('runtime-results.json',JSON.stringify({boundary:'Mocked DOM/WebGL; actual Three.js geometries and game update functions. This does not verify GPU output or headset support.',results,failed:fail},null,2));console.log('Finished',results.length,'passed,',fail,'failed');process.exitCode=fail?1:0;
})();
