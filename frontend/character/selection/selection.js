// Wardrobe page: the chosen character stands in an open wardrobe; tops hang on the left rail,
// trousers sit on the right shelf and every character waits in the drawer below.
import {characterCatalog,characterEntry,DEFAULT_CHARACTER} from '../avatar/character-catalog.js';
import {characterGender,resolveCharacterVoice,dashboardLanguage} from '../companion/language-voice.js';
import {createAssetScene} from '../avatar/asset-scene.js';
import {record} from '../character-profile/avatar3d-data.js';
import {createSpeech} from '../companion/browser-speech.js';
import {restoreClothing,PANTS_COLORS,UPPER_LABELS} from '../customization/clothing.js';
const $=id=>document.getElementById(id),api=`http://${location.hostname}:8000/phase2/browser/character/selection`;
let view,closed=false,loading=false,pending=null,canSave=false,saving=false,walkSide=-1,chosenByUser=false;
let clothingAvailable=false,draftRevision=0,filter='all';
const speech=createSpeech({synth:window.speechSynthesis,Utterance:window.SpeechSynthesisUtterance,
 mouth:value=>view?.mouth(value),caption:text=>$('sample-caption').textContent=text,
 status:text=>$('sample-status').textContent=text,state:value=>view?.speechState(value==='speaking')});

// ---- wardrobe pieces ----
const TOPS=[
 {value:null,label:UPPER_LABELS.formal,about:'Suit & tie',icon:'suit'},
 {value:'shirt',label:UPPER_LABELS.shirt,about:'Collared, buttoned',icon:'shirt'},
 {value:'tshirt',label:UPPER_LABELS.tshirt,about:'Crew neck',icon:'tee'},
];
const TROUSERS=[{value:'black',label:'Black formal'},{value:'blue',label:'Blue formal'}];
const SWATCHES=[['White','#ffffff'],['Sky','#cfe3f7'],['Mint','#d4efe1'],['Blush','#f5d8dc'],['Lilac','#e0d6f2'],['Sand','#efe3c8'],['Grey','#b9bec7'],['Charcoal','#55595f']];
const ICONS={
 suit:'<path d="M20 8l12 6 12-6 10 6 4 40H6l4-40z" class="cloth"/><path d="M32 14l-6 16 6 22 6-22z" class="shirtv"/><path d="M30 18h4l1 20-3 4-3-4z" class="tie"/><path d="M20 8l6 22-8-4zM44 8l-6 22 8-4z" class="lapel"/>',
 shirt:'<path d="M22 8l10 6 10-6 14 8-5 12-5-2v28H18V26l-5 2-5-12z" class="cloth"/><path d="M22 8l10 10 10-10-4 10-6 2-6-2z" class="lapel"/><path d="M32 20v34" class="seam"/><circle cx="32" cy="28" r="1.2" class="btn"/><circle cx="32" cy="36" r="1.2" class="btn"/><circle cx="32" cy="44" r="1.2" class="btn"/>',
 tee:'<path d="M24 8c2 5 14 5 16 0l16 8-5 12-6-3v29H19V25l-6 3-5-12z" class="cloth"/><path d="M24 8c2 5 14 5 16 0" class="seam"/>',
 trousers:'<path d="M18 6h28l4 52H36l-4-34-4 34H14z" class="cloth"/><path d="M18 12h28" class="seam"/><path d="M32 12v10" class="seam"/>',
};
const svg=(name,colour)=>`<svg viewBox="0 0 64 64" aria-hidden="true" style="--piece:${colour}">${ICONS[name]}</svg>`;
function piece(label,about,icon,colour,onClick){
 const b=document.createElement('button');b.type='button';b.className='piece';b.setAttribute('role','radio');
 b.innerHTML=`<span class="hanger" aria-hidden="true"></span>${svg(icon,colour)}<span class="piece-text"><strong>${label}</strong><small>${about}</small></span>`;
 b.onclick=onClick;return b;
}
const topButtons=TOPS.map(t=>piece(t.label,t.about,t.icon,t.value?'#f4f6fa':'#2a3242',()=>changeClothing(t.value?{upperBody:t.value}:{upperBody:null,upperColor:null})));
topButtons.forEach(b=>$('tops').append(b));
const trouserButtons=TROUSERS.map(t=>piece(t.label,'Pressed, straight leg','trousers',PANTS_COLORS[t.value],()=>changeClothing({pantsColor:t.value})));
trouserButtons.forEach(b=>$('trousers').append(b));
const swatchButtons=SWATCHES.map(([name,hex])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('role','radio');b.title=name;b.setAttribute('aria-label',name);b.style.setProperty('--sw',hex);b.onclick=()=>changeClothing({upperColor:hex==='#ffffff'?null:hex});return b;});
swatchButtons.forEach(b=>$('swatches').append(b));

// ---- character drawer ----
const cards=new Map();
for(const c of characterCatalog){
 $('choice').append(new Option(c.label,c.id));
 const b=document.createElement('button');b.type='button';b.className='person';b.dataset.gender=c.gender;b.setAttribute('role','radio');b.setAttribute('aria-label',c.label);
 b.innerHTML=`<img src="${c.thumbnail}" alt="" loading="lazy"><span>${c.label}</span>`;
 b.onclick=()=>{if(saving||$('choice').value===c.id)return;$('choice').value=c.id;return $('choice').onchange();};
 $('people').append(b);cards.set(c.id,b);
}
for(const tab of document.querySelectorAll('.filters [data-filter]'))tab.onclick=()=>{
 filter=tab.dataset.filter;for(const t of document.querySelectorAll('.filters [data-filter]'))t.setAttribute('aria-selected',String(t===tab));
 for(const [id,card] of cards)card.hidden=filter!=='all'&&characterEntry(id).gender!==filter;
};

function clothingControls(){
 const editor=loading?null:view?.getClothing(),cap=editor?.capabilities,value=editor?.value(),ready=!!cap?.upperTypes.length&&!saving;
 TOPS.forEach((t,i)=>{const on=value&&(value.upperBody??null)===t.value;topButtons[i].setAttribute('aria-checked',String(!!on));topButtons[i].disabled=!ready;});
 const formal=!value||value.upperBody===null;
 TROUSERS.forEach((t,i)=>{trouserButtons[i].setAttribute('aria-checked',String(value?.pantsColor===t.value));trouserButtons[i].disabled=!ready||formal;});
 $('pants-note').textContent=formal?'Office formal comes with its own matching suit trousers. Choose a shirt or T-shirt to pick black or blue.':'Formal trousers in black or blue.';
 const colour=value?.upperColor||'#ffffff';
 swatchButtons.forEach((b,i)=>{b.setAttribute('aria-checked',String(!formal&&SWATCHES[i][1]===colour));b.disabled=!ready||formal;});
 $('clothing-color').disabled=!ready||formal;$('clothing-color').value=colour;
 $('colour-title').textContent=value?.upperBody==='tshirt'?'T-shirt colour':'Shirt colour';
 $('colour-note').textContent=formal?'The suit keeps its own colours.':(value?.upperColor?'Custom colour on the '+UPPER_LABELS[value.upperBody].toLowerCase().replace('white ','')+'.':'White, as standard.');
 $('reset-clothing').disabled=!ready;
 $('save-look').disabled=saving||!view||loading||!canSave;
 $('save-look').textContent=saving?'Saving…':'Save my look';
 $('clothing-storage').textContent=canSave?(clothingAvailable?'Saves this character and outfit to your employee account.':'Saves this character to your account; outfit saving is not available on the server yet.'):'Sign in to save. You can still try everything on.';
}
function buttons(){
 for(const [id,card] of cards){card.setAttribute('aria-checked',String(id===$('choice').value));card.disabled=saving;}
 const entry=characterEntry($('choice').value);$('who').textContent=entry?.label||'…';$('who-about').textContent=entry?(entry.gender==='female'?'She/her':'He/him')+' · Office ready':'';
 for(const id of ['idle','walk','wave','mouth','left','right','speak-sample','stop-sample'])$(id).disabled=loading||!view;
 document.body.classList.toggle('is-loading',loading);
 clothingControls();
}
async function select(id){
 pending=id;if(loading)return;loading=true;buttons();
 while(pending&&!closed){const next=pending;pending=null;speech.stop();$('sample-caption').textContent='';$('sample-status').textContent='';$('clothing-status').textContent='';view?.dispose();view=null;$('status').textContent='Bringing out '+characterEntry(next).label+'…';
  try{const config=record().avatarConfiguration;const loaded=await createAssetScene($('stage'),config,t=>$('status').textContent=t,{assetReference:next,allowPreview:true,transparent:true});if(closed||pending){loaded.dispose();continue;}view=loaded;$('status').textContent=characterEntry(next).label+' is ready. Drag to turn them around.';}
  catch{$('status').textContent='Character could not load. Choose another character.';}
 }
 loading=false;buttons();
}
async function request(body){const r=await fetch(api,{credentials:'include',cache:'no-store',redirect:'error',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Character service unavailable');return data;}
$('choice').onchange=()=>{chosenByUser=true;draftRevision++;return select($('choice').value);};
function changeClothing(patch){if(loading||saving||!view)return;try{view.getClothing().apply(patch);draftRevision++;$('clothing-status').textContent='Looking good. Save my look to keep it.';}catch(e){$('clothing-status').textContent=e.message;}clothingControls();}
$('clothing-color').oninput=()=>changeClothing({upperColor:$('clothing-color').value});
$('reset-clothing').onclick=()=>{if(loading||saving||!view)return;draftRevision++;view.getClothing().reset();clothingControls();$('clothing-status').textContent='Back to office formal. Save to keep the reset.';};
$('idle').onclick=()=>{view.mouth('rest');view.animate('Idle');};$('walk').onclick=()=>{walkSide*=-1;view.moveTo([walkSide*.5,0,0]);};$('wave').onclick=()=>view.gesture();$('mouth').onclick=()=>view.mouth('demo');$('left').onclick=()=>view.camera('left');$('right').onclick=()=>view.camera('right');
$('speak-sample').onclick=()=>{const entry=characterEntry($('choice').value),voices=window.speechSynthesis?.getVoices()||[];
 const gender=characterGender(entry?.id),lang=dashboardLanguage(),preferred=resolveCharacterVoice(voices,lang,gender);
 if(!preferred&&!window.speechSynthesis){$('sample-status').textContent='Speech playback is unavailable in this browser. Mouth preview remains available.';return;}
 try{speech.speak('Hello, I am '+entry.label+'. I can guide you through your company training.',preferred,gender);$('sample-status').textContent='Speaking in a '+gender+' voice ('+lang+').';}catch(e){$('sample-status').textContent=e.message;}
};
$('stop-sample').onclick=()=>speech.stop();
// One save for the whole look: the character, plus the outfit when the server supports it.
$('save-look').onclick=async()=>{
 if(saving||loading||!view||!canSave)return;
 const asset=$('choice').value,{schemaVersion,pantsColor,upperBody,upperColor}=view.getClothing().value(),clothing={schemaVersion,pantsColor,upperBody,upperColor};
 saving=true;buttons();
 try{
  if(!clothingAvailable){await request({asset_reference:asset});if(!closed)$('clothing-status').textContent='Character saved. Outfit saving is not available on the server yet.';return;}
  const result=await request({asset_reference:asset,clothing});if(result.clothing_saved!==true)throw Error('The outfit was not acknowledged by the server; reload after the backend update.');
  const stored=await request();if(stored.asset_reference!==asset||Object.keys(clothing).some(key=>stored.clothing?.[key]!==clothing[key]))throw Error('Your look could not be confirmed; reload before retrying.');
  if(!closed)$('clothing-status').textContent='Your look is saved to your employee account.';
 }catch(e){if(!closed)$('clothing-status').textContent=e.message;}finally{saving=false;if(!closed)buttons();}
};
addEventListener('pagehide',()=>{closed=true;pending=null;speech.stop();view?.dispose();},{once:true});
const requestedCharacter=new URLSearchParams(location.search).get('asset');
const initialCharacter=characterEntry(requestedCharacter)?.id||DEFAULT_CHARACTER;
chosenByUser=initialCharacter===requestedCharacter;
$('choice').value=initialCharacter;
await select(initialCharacter);
const restoreRevision=draftRevision;
try{const data=await request();if(!closed){canSave=true;clothingAvailable=data.clothing_supported===true;$('account').textContent='Employee account connected.';if(!chosenByUser&&characterEntry(data.asset_reference)&&data.asset_reference!==$('choice').value){$('choice').value=data.asset_reference;await select(data.asset_reference);}if(!closed&&view&&restoreRevision===draftRevision&&$('choice').value===data.asset_reference){restoreClothing(view,data.asset_reference,data.clothing);if(data.clothing)$('clothing-status').textContent='Your saved look is on.';}buttons();}}catch(e){if(!closed){$('account').textContent='Not signed in — try things on freely; saving needs sign-in.';buttons();}}
