import {createScene} from './avatar-scene.js';
import {characterEntry,DEFAULT_CHARACTER} from './character-catalog.js';
import {prepareRocketboxAvatar} from './rocketbox-avatar.js';
export const ORIGINAL_ASSET=DEFAULT_CHARACTER;
// Explicit caller-owned selection, never inferred from identity or saved role.
const active=new WeakMap();
export async function createAssetScene(host,config,report,{assetReference=DEFAULT_CHARACTER,allowPreview=false,...options}={}){
 const entry=characterEntry(assetReference);if(!entry)throw Error('Unknown character asset');
 if(active.has(host))throw Error('Character renderer already exists or is loading');
 active.set(host,true);
 try{
  const avatarFactory=await prepareRocketboxAvatar(entry);
  const view=createScene(host,config,report,{...options,avatarFactory});const dispose=view.dispose;
  let disposed=false;view.dispose=()=>{if(disposed)return;disposed=true;try{dispose();}finally{active.delete(host);}};
  return view;
 }catch(e){active.delete(host);throw e;}
}
