// Visual names only; asset IDs and employee identities remain unchanged.
import {characterCatalog} from './character-catalog.js';
export const characterNames=Object.freeze(Object.fromEntries(characterCatalog.map(entry=>[entry.id,[entry.label]])));
