/* VRFigure: smooth, proportioned human figure built from code (no assets).
   VRFigure.make(opts) → {group, legs:[hipL,hipR], knees:[kL,kR], arms:[shL,shR], elbows:[eL,eR], head}
   Pivots rotate around x like a hinge (legs[0].rotation.x = swing). Height ≈ opts.height (default 1.78 m). */
(function(global){
'use strict';
const T = () => global.THREE;
function mat(c, r = .7, extra = {}){ return new (T().MeshStandardMaterial)(Object.assign({color:c, roughness:r, metalness:0}, extra)); }
function cap(r, len, m, seg = 10){ const g = new (T().CapsuleGeometry)(r, Math.max(.001, len - 2*r), 6, seg); const mesh = new (T().Mesh)(g, m); return mesh; }
function numberTex(num, col, bg){
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 256);
  x.fillStyle = 'rgba(0,0,0,.08)'; for (let i=0;i<256;i+=6) x.fillRect(0, i, 256, 2);
  if (num !== undefined && num !== null){ x.fillStyle = col; x.font = 'bold 120px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(num), 128, 140); }
  const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; return t;
}
function make(o = {}){
  const THREE = T(), H = (o.height || 1.78)/1.78;
  const skin = mat(o.skin || 0xc68b59, .6), shirtCol = o.shirt ?? 0xd7263d, shirt = mat(shirtCol, .8),
        shorts = mat(o.shorts ?? 0xffffff, .8), socks = mat(o.socks ?? shirtCol, .85), shoes = mat(o.shoes ?? 0x1b1b1f, .5), hair = mat(o.hair ?? 0x2a1d14, .9);
  const root = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(H); root.add(body);
  // torso: lathe profile, flattened front-to-back
  const prof = [[0,.0],[.17,.0],[.185,.06],[.175,.2],[.16,.3],[.19,.42],[.215,.52],[.2,.58],[.12,.62],[.06,.64],[0,.64]].map(([r,y]) => new THREE.Vector2(r, y));
  const tg = new THREE.LatheGeometry(prof, 28); tg.scale(1, 1, .62);
  const front = o.number !== undefined ? numberTex(o.number, o.numberColor || '#ffffff', '#' + new THREE.Color(shirtCol).getHexString()) : null;
  const torso = new THREE.Mesh(tg, front ? mat(0xffffff, .8, {map:front}) : shirt); torso.position.y = .9; body.add(torso);
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(.175, .16, .2, 24), shorts); pelvis.scale.z = .7; pelvis.position.y = .9; body.add(pelvis);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.05, .058, .12, 14), skin); neck.position.y = 1.56; body.add(neck);
  const head = new THREE.Group(); head.position.y = 1.63; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.105, 24, 18), skin); skull.scale.set(.92, 1.12, 1.0); skull.position.y = .08; head.add(skull);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(.112, 24, 14, 0, Math.PI*2, 0, Math.PI*.5), hair); hairM.scale.set(.94, .95, 1.04); hairM.position.set(0, .1, -.008); head.add(hairM);
  for (const s of [-1, 1]){ const ear = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 8), skin); ear.scale.set(.5, 1, .8); ear.position.set(s*.096, .075, 0); head.add(ear); }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), skin); nose.scale.set(.8, 1, 1.3); nose.position.set(0, .07, .1); head.add(nose);
  // legs: hip pivot → thigh → knee pivot → shin → shoe
  const legs = [], knees = [];
  for (const s of [-1, 1]){
    const hip = new THREE.Group(); hip.position.set(s*.095, .92, 0); body.add(hip);
    const thigh = cap(.08, .46, skin); thigh.position.y = -.23; hip.add(thigh);
    const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(.098, .092, .2, 18), shorts); shortLeg.position.y = -.08; hip.add(shortLeg);
    const knee = new THREE.Group(); knee.position.y = -.45; hip.add(knee);
    const shin = cap(.062, .44, skin); shin.position.y = -.21; knee.add(shin);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(.066, .058, .28, 16), socks); sock.position.y = -.28; knee.add(sock);
    const shoe = cap(.048, .25, shoes); shoe.rotation.x = Math.PI/2; shoe.scale.x = 1.25; shoe.position.set(0, -.43, .05); knee.add(shoe);
    legs.push(hip); knees.push(knee);
  }
  // arms
  const arms = [], elbows = [];
  for (const s of [-1, 1]){
    const sh = new THREE.Group(); sh.position.set(s*.205, 1.45, 0); sh.rotation.z = s*.12; body.add(sh);
    const delt = new THREE.Mesh(new THREE.SphereGeometry(.068, 16, 12), shirt); sh.add(delt);
    const upper = cap(.05, .3, skin); upper.position.y = -.15; sh.add(upper);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.064, .058, .15, 16), shirt); sleeve.position.y = -.05; sh.add(sleeve);
    const el = new THREE.Group(); el.position.y = -.29; el.rotation.x = -.15; sh.add(el);
    const fore = cap(.043, .27, skin); fore.position.y = -.13; el.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.045, 14, 10), o.gloves !== undefined ? mat(o.gloves, .6) : skin); hand.scale.set(.75, 1.15, .55); hand.position.y = -.29; el.add(hand);
    arms.push(sh); elbows.push(el);
  }
  root.traverse(n => { if (n.isMesh){ n.castShadow = true; } });
  return {group:root, legs, knees, arms, elbows, head};
}
global.VRFigure = {make};
})(window);
/* VRProps.blaster: rounded toy blaster (body shell, barrel shroud, grip with finger grooves, trigger guard, sight). Muzzle at z ≈ -0.25. */
(function(global){
function blaster(col, accent = 0xffffff, glow = null){
  const THREE = global.THREE, g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({color:col, roughness:.32, metalness:.35}), dark = new THREE.MeshStandardMaterial({color:0x22242c, roughness:.5, metalness:.3}), acc = new THREE.MeshStandardMaterial({color:accent, roughness:.4, metalness:.2});
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .14, 6, 16), shell); body.rotation.x = Math.PI/2; body.scale.set(.85, 1, 1.05); body.position.set(0, .012, -.07); g.add(body);
  const top = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .1, 4, 10), acc); top.rotation.x = Math.PI/2; top.position.set(0, .043, -.08); g.add(top);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(.019, .022, .09, 18), dark); shroud.rotation.x = Math.PI/2; shroud.position.set(0, .012, -.2); g.add(shroud);
  for (let i=0;i<3;i++){ const r = new THREE.Mesh(new THREE.TorusGeometry(.021, .003, 6, 18), acc); r.position.set(0, .012, -.175 - i*.025); g.add(r); }
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .006, 16), new THREE.MeshBasicMaterial({color:glow ?? accent})); muzzle.rotation.x = Math.PI/2; muzzle.position.set(0, .012, -.246); g.add(muzzle);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(.017, .07, 4, 12), dark); grip.scale.set(1, 1, 1.3); grip.rotation.x = -.3; grip.position.set(0, -.05, .025); g.add(grip);
  for (let i=0;i<3;i++){ const f = new THREE.Mesh(new THREE.TorusGeometry(.017, .003, 5, 12, Math.PI), dark); f.rotation.set(0, Math.PI/2, -.3); f.position.set(0, -.03 - i*.022, .002 + i*.007); g.add(f); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(.02, .004, 6, 18, Math.PI), shell); guard.rotation.y = Math.PI/2; guard.rotation.z = Math.PI; guard.position.set(0, -.012, -.018); g.add(guard);
  const trig = new THREE.Mesh(new THREE.CapsuleGeometry(.004, .014, 3, 6), acc); trig.rotation.x = .3; trig.position.set(0, -.018, -.012); g.add(trig);
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .012, 10), new THREE.MeshBasicMaterial({color:0x3ee08f})); sight.position.set(0, .058, -.12); g.add(sight);
  return g;
}
global.VRProps = {blaster};
})(window);
