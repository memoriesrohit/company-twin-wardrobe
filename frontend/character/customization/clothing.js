// Wardrobe for the Company Twin characters. Every character carries the same fitted garments:
//   Office formal (default): a suit, either their own or one fitted from a Rocketbox business character
//   White shirt or White T-shirt, each worn with formal trousers in black or blue
// Saved account format (unchanged): {schemaVersion:1, pantsColor, upperBody, upperColor} where
// upperBody null means Office formal and upperColor (optional) recolours the white shirt/T-shirt.
export const PANTS_COLORS=Object.freeze({black:'#1b2029',blue:'#243c5b'});
export const UPPER_TYPES=Object.freeze(['shirt','tshirt']);
export const UPPER_LABELS=Object.freeze({formal:'Office formal',shirt:'White shirt',tshirt:'White T-shirt'});
const HEX=/^#[0-9a-f]{6}$/i;

export function createClothing(model,avatarId){
 const outfit=model?.userData?.outfit;
 const ready=!!outfit&&model.userData.assetReference===avatarId;
 const capabilities=Object.freeze({
  pants:ready,upperTypes:Object.freeze(ready?[...UPPER_TYPES]:[]),formal:ready,
  pantsReason:ready?'':'This character has no fitted wardrobe.',
  upperReason:ready?'Office formal, white shirt or white T-shirt.':'This character has no fitted wardrobe.',
 });
 const defaults=()=>({schemaVersion:1,avatarId,pantsColor:'black',upperBody:null,upperColor:null});
 let config=defaults(),disposed=false;
 function show(){if(ready)outfit.wear({upperBody:config.upperBody,pantsColor:config.pantsColor,upperColor:config.upperColor});}
 return {
  capabilities,
  value:()=>({...config}),
  apply(patch){
   if(disposed)throw Error('Clothing preview is closed.');
   if(!ready)throw Error(capabilities.upperReason);
   if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!['pantsColor','upperBody','upperColor'].includes(k)))throw Error('Unsupported clothing setting.');
   const next={...config,...patch};
   // Validate the entire update before touching any material.
   if(next.pantsColor!==null&&!Object.hasOwn(PANTS_COLORS,next.pantsColor))throw Error('Trousers come in black or blue.');
   if(next.upperBody!==null&&!UPPER_TYPES.includes(next.upperBody))throw Error('Choose Office formal, White shirt or White T-shirt.');
   if(next.upperColor!==null&&(typeof next.upperColor!=='string'||!HEX.test(next.upperColor)))throw Error('Top colour is invalid.');
   if(next.upperBody===null)next.upperColor=null; // the suit keeps its own colours
   config=next;show();return {...config};
  },
  reset(){if(disposed)return;config=defaults();show();return {...config};},
  dispose(){if(disposed)return;this.reset();disposed=true;},
 };
}

// Validated account appearance only; no identity, permissions or local storage.
export function restoreClothing(view,avatarId,stored){
 if(!stored)return;
 if(stored.schemaVersion!==1||Object.keys(stored).some(k=>!['schemaVersion','pantsColor','upperBody','upperColor'].includes(k)))throw Error('Unsupported saved clothing format');
 const controller=view.getClothing();if(controller.value().avatarId!==avatarId)throw Error('Saved clothing belongs to another avatar');
 controller.apply({pantsColor:stored.pantsColor??'black',upperBody:stored.upperBody??null,upperColor:stored.upperColor??null});
}
