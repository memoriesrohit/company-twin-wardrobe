// Runtime adapter for the 20 Company Twin characters (Microsoft Rocketbox, MIT; see
// ../assets/avatars/LICENSE.ROCKETBOX.md). Each GLB carries:
//   Body (head + face), Hair, ARKit face shapes, eye bones, 13 motion-captured clips, and outfits:
//   Outfit_formal/Skin_formal (fitted suit) or Outfit_original/Skin_original (own suit),
//   Top_shirt/Skin_shirt, Top_tee/Skin_tee, Trousers, Shoes.
// It implements the avatar contract used by avatar-scene.js (animate, update, setBlink, setViseme,
// gesture, dispose) and exposes the outfit for customization/clothing.js.
import * as T from '../vendor/three/build/three.module.js';
import {GLTFLoader} from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkinned} from '../vendor/three/examples/jsm/utils/SkeletonUtils.js';

// Scene modes -> motion-captured clips (Rocketbox's own mocap, recorded for this skeleton)
const CLIPS = {Idle: 'Idle', Walk: 'Walk', Talking: 'Talk', Waving: 'Wave', Working: 'Think',
  Sitting: 'Idle', Turn: 'Idle', Static: 'Idle', Pause: 'Idle'};
// Speech mouth shapes from the 52 ARKit face shapes every character carries. Jaw and lips move
// together like real speech: open vowels drop the jaw, E stretches, O rounds, M/B/P presses shut.
const VISEMES = {
  AA: {jawOpen: .5, mouthLowerDownLeft: .32, mouthLowerDownRight: .32, mouthUpperUpLeft: .12, mouthUpperUpRight: .12, mouthStretchLeft: .06, mouthStretchRight: .06},
  EE: {jawOpen: .17, mouthStretchLeft: .38, mouthStretchRight: .38, mouthSmileLeft: .22, mouthSmileRight: .22, mouthUpperUpLeft: .1, mouthUpperUpRight: .1},
  OO: {jawOpen: .24, mouthFunnel: .55, mouthPucker: .45, mouthLowerDownLeft: .08, mouthLowerDownRight: .08},
  MBP: {mouthClose: .35, mouthPressLeft: .45, mouthPressRight: .45, mouthRollLower: .15},
  rest: {},
};
const MOUTH_KEYS = [...new Set(Object.values(VISEMES).flatMap(Object.keys))];
export const OUTFIT_PARTS = {
  formal: ['Outfit_formal', 'Skin_formal'],
  ownFormal: ['Outfit_original', 'Skin_original'],
  shirt: ['Top_shirt', 'Skin_shirt', 'Trousers', 'Shoes'],
  tshirt: ['Top_tee', 'Skin_tee', 'Trousers', 'Shoes'],
};
const ALL_PARTS = new Set(['Outfit_original', 'Skin_original', ...Object.values(OUTFIT_PARTS).flat()]);
// Multiplied onto the neutral (light grey) trouser fabric
export const TROUSER_TINTS = {black: '#3a3b40', blue: '#2c3e6b'};

const loader = new GLTFLoader();
const sources = new Map();
const label = o => (o.name && !/^mesh_\d|_\d+$/.test(o.name) ? o.name : o.parent?.name ?? o.name);

function featheredAlpha(tex, px = 3, gain = 1) {
  const img = tex.image, c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.filter = `blur(${px}px)`; g.drawImage(img, 0, 0);
  const blurred = g.getImageData(0, 0, c.width, c.height);
  g.filter = 'none'; g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0);
  const sharp = g.getImageData(0, 0, c.width, c.height);
  for (let i = 3; i < sharp.data.length; i += 4) sharp.data[i] = Math.min(255, blurred.data[i] * gain);
  g.putImageData(sharp, 0, 0);
  const t = new T.CanvasTexture(c);
  Object.assign(t, {colorSpace: tex.colorSpace, flipY: tex.flipY, wrapS: tex.wrapS, wrapT: tex.wrapT, channel: tex.channel, anisotropy: 8});
  return t;
}

// Physically based materials: solid skin keeping the characters' own detail maps, soft-edged hair,
// matte cloth with a gentle sheen, smoother leather shoes.
function fixMaterial(o) {
  const name = label(o), src = o.material;
  const m = new T.MeshPhysicalMaterial({name: src.name, map: src.map, normalMap: src.normalMap, normalScale: src.normalScale,
    color: src.color, roughness: src.roughness, metalness: 0, roughnessMap: src.roughnessMap, side: src.side});
  if (/^Hair/.test(name)) {
    Object.assign(m, {alphaTest: .5, alphaToCoverage: true, side: T.DoubleSide, roughness: .78, sheen: .12, sheenRoughness: .5, specularIntensity: .25});
    m.sheenColor.copy(src.color).multiplyScalar(.6);
  } else if (/^(Body|Skin)/.test(name)) {
    Object.assign(m, {roughness: src.roughnessMap ? 1 : .5, specularIntensity: .4});
  } else if (/^Shoes/.test(name)) {
    Object.assign(m, {roughness: .45, roughnessMap: null, clearcoat: .3, clearcoatRoughness: .35, specularIntensity: .6});
  } else {
    Object.assign(m, {roughness: src.roughnessMap ? 1 : .82, sheen: .6, sheenRoughness: .85, specularIntensity: .3});
    m.sheenColor.copy(src.color).lerp(new T.Color(0xffffff), .5).multiplyScalar(.5);
  }
  // (the source material is shared with the cached GLB that other instances clone; keep it)
  o.material = m;
}

/** Load (once per page) and return a factory that builds independent instances of the character. */
export async function prepareRocketboxAvatar(entry) {
  const url = new URL(entry.path, import.meta.url).href;
  if (!sources.has(url)) sources.set(url, loader.loadAsync(url).catch(e => {sources.delete(url); throw e;}));
  const gltf = await sources.get(url);
  return config => buildRocketboxAvatar(gltf, entry, config);
}

export function buildRocketboxAvatar(gltf, entry, config) {
  const model = cloneSkinned(gltf.scene), group = new T.Group();
  group.add(model);
  group.userData.assetReference = entry.id;
  group.userData.requestedAppearance = structuredClone(config ?? null);
  const parts = new Map(), faces = [], hair = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.frustumCulled = false; // skinned meshes move outside their rest-pose bounds
    fixMaterial(o);
    o.userData.baseColor = o.material.color.clone();
    const name = label(o);
    if (!parts.has(name)) parts.set(name, []);
    parts.get(name).push(o);
    if (o.morphTargetDictionary?.jawOpen !== undefined) faces.push(o);
    if (/^Hair/.test(name) && o.material.map) hair.push(o);
  });
  // hair in two passes: opaque core, then a blended pass for soft strand tips
  for (const o of hair) {
    const tips = o.clone(), m = o.material.clone();
    Object.assign(m, {map: featheredAlpha(o.material.map), alphaTest: .02, alphaToCoverage: false, transparent: true, depthWrite: false});
    tips.material = m; tips.name = 'HairTips'; tips.renderOrder = 1; tips.castShadow = false;
    o.parent.add(tips);
    // the hair layer also holds lashes and brows: their soft edges blink and move with the face
    if (tips.morphTargetDictionary?.jawOpen !== undefined) faces.push(tips);
  }
  const fittedSuit = parts.has('Outfit_formal');
  // ---- outfit ----
  let outfit = {upperBody: null, pantsColor: 'black', upperColor: null};
  function wear(next) {
    outfit = {...outfit, ...next};
    const top = outfit.upperBody ?? (fittedSuit ? 'formal' : 'ownFormal');
    const show = new Set(OUTFIT_PARTS[top]);
    for (const [name, meshes] of parts) if (ALL_PARTS.has(name)) for (const o of meshes) o.visible = show.has(name);
    for (const o of parts.get('Trousers') || []) o.material.color.copy(o.userData.baseColor).multiply(new T.Color(TROUSER_TINTS[outfit.pantsColor] || TROUSER_TINTS.black));
    for (const name of ['Top_shirt', 'Top_tee']) for (const o of parts.get(name) || []) {
      o.material.color.copy(o.userData.baseColor);
      if (outfit.upperColor && outfit.upperBody) o.material.color.multiply(new T.Color(outfit.upperColor));
    }
  }
  wear({});
  group.userData.outfit = {fittedSuit, value: () => ({...outfit}), wear};
  // ---- motion ----
  const mixer = new T.AnimationMixer(model), actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
  let current = null, mode = 'Idle', waving = false, disposed = false;
  function play(clipName, fade = .4) {
    const next = actions[clipName] || actions.Idle;
    if (!next || next === current) return;
    next.reset().setLoop(T.LoopRepeat, Infinity).setEffectiveWeight(1).play();
    if (current) next.crossFadeFrom(current, fade, false);
    current = next;
  }
  function onFinished(event) {
    if (event.action !== actions.Wave || !waving) return;
    waving = false; current = actions.Wave; play(CLIPS[mode] || 'Idle', .5);
  }
  mixer.addEventListener('finished', onFinished);
  play('Idle', 0);
  mixer.update(0);
  // ---- face ----
  const mouthNow = Object.fromEntries(MOUTH_KEYS.map(k => [k, 0]));
  let mouthTarget = {};
  function setShape(key, value) {
    for (const o of faces) {const i = o.morphTargetDictionary[key]; if (i !== undefined) o.morphTargetInfluences[i] = value;}
  }
  return {
    group, animations: [], runtime: true,
    outfit: {fittedSuit, value: () => ({...outfit}), wear},
    animate(name) {
      if (disposed) return;
      if (!Object.hasOwn(CLIPS, name)) throw Error('Unsupported character animation');
      mode = name;
      mixer.timeScale = name === 'Pause' || name === 'Static' ? 0 : 1;
      if (name === 'Waving') {this.gesture(1); return;}
      if (!waving) play(CLIPS[name]);
    },
    update(dt) {
      if (disposed) return;
      dt = Math.min(.05, Math.max(0, dt));
      mixer.update(dt);
      // ease the lips toward the current speech shape: jaw and mouth move smoothly, never snap
      const k = 1 - Math.exp(-dt * 22);
      for (const key of MOUTH_KEYS) {
        mouthNow[key] += ((mouthTarget[key] ?? 0) - mouthNow[key]) * k;
        setShape(key, mouthNow[key]);
      }
    },
    setBlink(amount) {const a = Math.min(1, Math.max(0, amount || 0)); setShape('eyeBlinkLeft', a); setShape('eyeBlinkRight', a);},
    setViseme(name, amount = 1) {
      const pose = VISEMES[name] ?? VISEMES[{demo: 'AA'}[name]] ?? {};
      const a = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
      mouthTarget = Object.fromEntries(Object.entries(pose).map(([k, v]) => [k, v * a]));
    },
    gesture(amount) {
      if (disposed || amount <= 0 || waving || !actions.Wave) return;
      waving = true;
      const wave = actions.Wave;
      wave.reset().setLoop(T.LoopOnce, 1).setEffectiveWeight(1).play();
      wave.clampWhenFinished = false;
      if (current && current !== wave) wave.crossFadeFrom(current, .35, false);
      current = wave;
    },
    assertExport() {},
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.removeEventListener('finished', onFinished);
      mixer.stopAllAction(); mixer.uncacheRoot(model);
      model.traverse(o => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m?.map?.isCanvasTexture) m.map.dispose();
          m?.dispose();
        }
      });
      group.remove(model);
    },
  };
}
