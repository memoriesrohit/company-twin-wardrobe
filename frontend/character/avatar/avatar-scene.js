import {fullBodyDistance} from './framing.js';
import {createWaypointMotion} from '../animation/waypoint-motion.js';
import * as T from '../vendor/three/build/three.module.js';
import { OrbitControls } from '../vendor/three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from '../vendor/three/examples/jsm/exporters/GLTFExporter.js';
import {createClothing} from '../customization/clothing.js';

export function createScene(host, config, report, {transparent=false,avatarFactory,framePadding=1}={}) {
  if(typeof avatarFactory!=='function')throw new Error('A character asset factory is required');
  // Construct before allocating WebGL: load/asset errors leave no canvas behind.
  let prepared=avatarFactory(config);
  let renderer;
  try{renderer = new T.WebGLRenderer({antialias: true, alpha: transparent});}
  catch(error){prepared.dispose();throw error;}
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  // Khronos PBR Neutral keeps skin, lips and fabric colours true (ACES darkened and desaturated skin)
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D character preview; drag or use camera controls to rotate; full-body framing is automatic');
  const scene = new T.Scene(); scene.background = transparent ? null : new T.Color('#101d2e');
  const camera = new T.PerspectiveCamera(35, 1, .05, 50);
  camera.position.set(.35, 1.45, 3.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, .96, 0);
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true;
  controls.touches.ONE=T.TOUCH.ROTATE;controls.touches.TWO=null;
  controls.minDistance = 1; controls.maxDistance = Infinity;
  controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI * .57;
  controls.update(); controls.saveState();
  function frameBody(){
    const direction=camera.position.clone().sub(controls.target).normalize();
    controls.target.set(avatar?.group.position.x||0,.96,avatar?.group.position.z||0);
    const distance=fullBodyDistance(camera.aspect,camera.fov,direction.toArray(),mode==='Waving'?.8:.38,['Walk','Sitting','Working'].includes(mode)?.75:.35,framePadding);
    controls.minDistance=distance;controls.maxDistance=distance;
    camera.position.copy(controls.target).addScaledVector(direction,distance);controls.update();
  }
  scene.add(new T.HemisphereLight('#fff8f3', '#746c68', 1.35));
  const key = new T.DirectionalLight('#fff7ef', 2.2);
  key.position.set(2, 3, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -2;
  key.shadow.bias = -.0004; scene.add(key);
  const fill = new T.DirectionalLight('#fff8f2', 1.25);
  fill.position.set(-2,1.7,5);scene.add(fill);
  const rim = new T.DirectionalLight('#e2e9f2', 1.0); rim.position.set(-3, 3, -3); scene.add(rim);
  const floor = new T.Mesh(new T.CylinderGeometry(1.25, 1.29, .055, 64),
    new T.MeshStandardMaterial({color: '#22354c', roughness: .9}));
  floor.position.y = -.025; floor.receiveShadow = true; scene.add(floor);
  const ring = new T.Mesh(new T.TorusGeometry(1.23, .008, 8, 100),
    new T.MeshBasicMaterial({color: '#4ad6d0'}));
  ring.rotation.x = Math.PI / 2; ring.position.y = .006; scene.add(ring);
  if(transparent){floor.visible=false;ring.visible=false;renderer.setClearColor(0,0);}
  let mouthMode = 'rest', mouthTime = 0, gestureTime=0;
  const navigation=createWaypointMotion({speed:.45});let navigating=false;
  let activeAction,ambientTime=0,facing=null;
  let avatar, clothing, mixer, mode = 'Idle', elapsed = 0, previous = 0, frame = 0, stopped = false;
  function animate(name) {
    if (!['Idle', 'Walk', 'Turn', 'Pause','Static','Sitting','Working','Waving','Talking'].includes(name)) throw new Error('Unsupported animation');
    if(avatar?.runtime){
      avatar.animate(name);mode=name;
      if(name==='Idle')navigating=false;
      return;
    }
    if(name!=='Walk')navigating=false;
    mode = name;
    if (name === 'Pause') { mixer.timeScale = 0; return; }
    mixer.timeScale = 1;
    const next=mixer.clipAction(avatar.animations.find(c=>c.name===name));
    next.reset().setEffectiveWeight(1).play();
    if(activeAction&&activeAction!==next)next.crossFadeFrom(activeAction,.3,false);
    activeAction=next;
    avatar.group.position.x = 0; elapsed = 0;
  }
  function setAppearance(next) {
    const replacement = prepared || avatarFactory(next);prepared=null;
    if (avatar) {
      clothing?.dispose();clothing=null;
      mixer.stopAllAction(); mixer.uncacheRoot(avatar.group);
      scene.remove(avatar.group); avatar.dispose();
    }
    avatar = replacement; scene.add(avatar.group);
    activeAction=null;mixer = new T.AnimationMixer(avatar.group); animate(mode);
  }
  setAppearance(config);
  const resize = new ResizeObserver(() => {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();frameBody();
  });
  resize.observe(host);
  let sampleStart = 0, sampleFrames = 0;
  function tick(now) {
    if (stopped) return;
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 0; previous = now;
    if (!document.hidden) {
      elapsed += delta; if(!avatar.runtime)mixer.update(delta);ambientTime+=delta;const blinkPhase=ambientTime%4.7;avatar.setBlink(mode==='Static'||mode==='Pause'?0:blinkPhase<.18?Math.sin(blinkPhase/.18*Math.PI):0);
      if(gestureTime>0){gestureTime=Math.max(0,gestureTime-delta);avatar.gesture(Math.min(1,gestureTime*2));}
      if (mouthMode==='demo' && mode!=='Pause') mouthTime+=delta;
      const syllables=['AA','rest','EE','rest','OO','rest'];
      avatar.setViseme(mouthMode==='demo'?syllables[Math.floor(mouthTime/.28)%syllables.length]:mouthMode,
        mouthMode==='demo'?Math.sin((mouthTime%.28)/.28*Math.PI):1);
      if(navigating&&mode!=='Pause'){const state=navigation.step(delta);avatar.group.position.set(...state.position);if(state.heading!==null)avatar.group.rotation.y=state.heading;if(!state.moving){navigating=false;animate('Idle');avatar.group.position.set(...state.position);}}
      if(facing!==null&&!navigating)avatar.group.rotation.y=T.MathUtils.damp(avatar.group.rotation.y,facing,8,delta);
      if(avatar.runtime&&mode!=='Pause')avatar.update(delta,navigating);
      controls.update(); frameBody();renderer.render(scene, camera);
      // Local render diagnostics for acceptance testing; no network telemetry.
      sampleFrames++;
      if (!sampleStart) sampleStart = now;
      if (now - sampleStart >= 2000) {
        renderer.domElement.dataset.renderFps = (sampleFrames * 1000 / (now - sampleStart)).toFixed(1);
        renderer.domElement.dataset.renderTriangles = String(renderer.info.render.triangles);
        renderer.domElement.dataset.renderCalls = String(renderer.info.render.calls);
        sampleStart = now; sampleFrames = 0;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function lost(event) { event.preventDefault(); report('3D graphics context lost. Reload to restore the preview.'); }
  renderer.domElement.addEventListener('webglcontextlost', lost);
  frame = requestAnimationFrame(tick);
  return {
    portrait(){renderer.render(scene,camera);const source=renderer.domElement;const image=document.createElement('canvas');image.width=image.height=128;const size=Math.min(source.width,source.height*.46);image.getContext('2d').drawImage(source,(source.width-size)/2,source.height*.06,size,size,0,0,128,128);return image.toDataURL('image/png');},
    setAppearance, animate,
    // Lazy, opt-in material editing. Production companions keep their defaults.
    getClothing(){return clothing ||= createClothing(avatar.group,avatar.group.userData.assetReference);},
    // Speech state is not a navigation stop command. Arrival still owns Idle.
    speechState(talking){if(!navigating)animate(talking?'Talking':'Idle');},
    face(angle){if(Number.isFinite(angle)&&Math.abs(angle)<=.3)facing=angle;},
    moveTo(point){if(!Array.isArray(point)||point.length!==3||point.some(v=>!Number.isFinite(v))||Math.hypot(point[0],point[2])>1||point[1]!==0)throw new Error('Destination outside preview stage');const start=avatar.group.position.toArray();animate('Walk');navigation.reset(start);navigation.follow([point]);navigating=true;},
    configureScene(scene){const defaults={preview:'Idle',guide:'Idle',training:'Talking',desk:'Working'};if(!Object.hasOwn(defaults,scene))throw new Error('Unsupported character scene');animate(defaults[scene]);},
    gesture(){gestureTime=3;},
    mouth(name) {if(!['rest','AA','EE','OO','demo'].includes(name))throw new Error('Unsupported mouth pose');mouthMode=name;mouthTime=0;},
    camera(action) {
      if (action === 'reset') { camera.position.set(.35,1.45,3.6);controls.target.set(0,.96,0);frameBody();return; }
      const offset = camera.position.clone().sub(controls.target);
      if (action === 'left' || action === 'right') offset.applyAxisAngle(new T.Vector3(0, 1, 0), action === 'left' ? -.25 : .25);
      else throw new Error('Unsupported camera action');
      camera.position.copy(controls.target).add(offset); controls.update();
    },
    async exportGLB(appearance) {
      const clean = avatarFactory(appearance);
      try {
        clean.assertExport?.();
        return await new GLTFExporter().parseAsync(clean.group, {binary: true, animations: clean.animations});
      } finally { clean.dispose(); }
    },
    suspend() { stopped = true; cancelAnimationFrame(frame); },
    resume() { if (stopped) { stopped = false; previous = 0; frame = requestAnimationFrame(tick); } },
    dispose() {
      stopped = true; cancelAnimationFrame(frame); resize.disconnect(); controls.dispose();
      clothing?.dispose();clothing=null;
      mixer.stopAllAction(); mixer.uncacheRoot(avatar.group); avatar.dispose();
      floor.geometry.dispose(); floor.material.dispose(); ring.geometry.dispose(); ring.material.dispose();
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
