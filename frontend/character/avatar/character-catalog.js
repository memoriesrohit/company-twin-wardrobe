// The 20 Company Twin characters: realistic, rigged people converted from the Microsoft Rocketbox
// avatar library (MIT licence, see ../assets/avatars/LICENSE.ROCKETBOX.md).
// Asset IDs are presentation references, never employee IDs or permissions.
// `formal` says whether the person's own outfit is already an office suit; everyone else carries a
// fitted office-formal suit in their model. All carry the white shirt, white T-shirt and formal trousers.
const people = [
  ['sophia', 'Sophia', 'female', true], ['mia', 'Mia', 'female', false], ['priya', 'Priya', 'female', false],
  ['emma', 'Emma', 'female', false], ['aisha', 'Aisha', 'female', true], ['olivia', 'Olivia', 'female', false],
  ['mei', 'Mei', 'female', false], ['hannah', 'Hannah', 'female', false],
  ['daniel', 'Daniel', 'male', true], ['marcus', 'Marcus', 'male', true], ['arjun', 'Arjun', 'male', false],
  ['ryan', 'Ryan', 'male', false], ['james', 'James', 'male', true], ['kenji', 'Kenji', 'male', true],
  ['leo', 'Leo', 'male', false], ['ethan', 'Ethan', 'male', false], ['noah', 'Noah', 'male', false],
  ['luca', 'Luca', 'male', false], ['carlos', 'Carlos', 'male', false], ['andre', 'Andre', 'male', false],
];

export const characterCatalog = Object.freeze(people.map(([key, label, gender, ownFormal]) => Object.freeze({
  id: `rocketbox:${key}-v1`, label, gender, ownFormal, modelId: key,
  path: `../assets/avatars/${key}.glb`, thumbnail: `../assets/avatars/thumbs/${key}.jpg`,
})));

export const DEFAULT_CHARACTER = 'rocketbox:sophia-v1';
export const characterEntry = id => characterCatalog.find(entry => entry.id === id);
