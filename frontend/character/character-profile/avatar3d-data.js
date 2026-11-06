import './character-data.js';
const base = globalThis.AHDUSCharacterData;
export const options = Object.freeze({
  ...base.options,
  shoes:['sneakers','formal','boots'],
  eyes: ['almond', 'round', 'soft'],
  eyeColor: ['#52372b', '#477d68', '#427fa4', '#8170a5'],
});
// Keep the original four looks stable; add twenty intentionally varied starting looks.
const original = base.presets.map((p, i) => ({
  ...p, shoes:['sneakers','formal','boots'][i%3], eyes: options.eyes[i % 3], eyeColor: options.eyeColor[i],
}));
const additions = Array.from({length: 20}, (_, i) => ({
  shoes:options.shoes[i%3], face: options.face[i % 3], hair: options.hair[i % 4],
  skin: options.skin[i % 5], hairColor: options.hairColor[(i + 1) % 4],
  clothing: options.clothing[(i + 1) % 3], color: options.color[(i + 2) % 5],
  accessory: options.accessory[Math.floor(i / 4) % 3],
  eyes: options.eyes[(i + 1) % 3], eyeColor: options.eyeColor[(i + 2) % 4],
}));
export const presets = Object.freeze([...original, ...additions].map(p => Object.freeze(p)));
export function validate(raw) {
  if(raw&&typeof raw==='object')raw={shoes:'sneakers',...raw};
  if (!raw || Object.entries(options).some(([key, values]) => !values.includes(raw[key]))) {
    throw new Error('Unsupported 3D appearance');
  }
  return Object.fromEntries(Object.keys(options).map(key => [key, raw[key]]));
}
export function record(config = presets[0]) {
  return {
    schemaVersion: 2, characterId: 'synthetic-character-3d-001',
    employeeId: 'synthetic-employee-001', assetReference: 'rocketbox:sophia-v1',
    avatarConfiguration: validate(config), animationState: 'idle',
  };
}
export function parse(text) {
  const data = JSON.parse(text);
  // records made with the retired avatars fall back to the default character
  if(typeof data.assetReference==='string'&&!data.assetReference.startsWith('rocketbox:'))data.assetReference='rocketbox:sophia-v1';
  const expected = record();
  for (const key of ['schemaVersion', 'characterId', 'employeeId', 'assetReference']) {
    if (data[key] !== expected[key]) throw new Error('Unsupported synthetic character');
  }
  return record(data.avatarConfiguration);
}
export function randomize(random = Math.random) {
  return Object.fromEntries(Object.entries(options).map(([key, values]) =>
    [key, values[Math.min(values.length - 1, Math.floor(random() * values.length))]]));
}
