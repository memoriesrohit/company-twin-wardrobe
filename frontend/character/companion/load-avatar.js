import {COMPANION_ASSET,FALLBACK_ASSET} from './avatar-config.js';
import {validChoice} from './character-choice.js';
export async function loadCompanionAvatar(create,host,appearance,report,isCurrent=()=>true,selected=COMPANION_ASSET){
 if(!validChoice(selected))throw Error('Unsupported character selection');
 for(const assetReference of [...new Set([selected,FALLBACK_ASSET])]){
  if(!isCurrent())return null;
  try{
   const view=await create(host,appearance,report,{assetReference,transparent:true});
   if(!isCurrent()){view.dispose();return null;}
   return {view,assetReference};
  }catch(error){
   // Never create a second canvas after partial renderer initialization.
   if(host.querySelector('canvas')||assetReference===FALLBACK_ASSET)throw error;
   report('Selected character unavailable; loading the original avatar.');
  }
 }
}
