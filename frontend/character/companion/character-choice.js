// Visual preference only: never an employee binding or authorization record.
export const CHOICE_KEY='ahdus.character.browser-choice.v1';
import {characterCatalog,DEFAULT_CHARACTER} from '../avatar/character-catalog.js';
// Show evaluation candidates without granting production/account eligibility.
export const selectionChoices=characterCatalog;
export const choices=characterCatalog.filter(choice=>!choice.previewOnly);
export function validChoice(id){return choices.some(choice=>choice.id===id);}
export function readChoice(storage){
 try{const value=JSON.parse(storage.getItem(CHOICE_KEY));if(value?.version===1&&validChoice(value.assetReference))return value.assetReference;}catch{}
 return DEFAULT_CHARACTER; // includes choices of retired avatars
}
export function writeChoice(storage,id){
 if(!validChoice(id))throw Error('Character is not production-compatible yet');
 storage.setItem(CHOICE_KEY,JSON.stringify({version:1,assetReference:id}));
}
