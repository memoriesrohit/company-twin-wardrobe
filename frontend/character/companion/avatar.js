import {createAssetScene} from '../avatar/asset-scene.js';
import {loadCompanionAvatar} from './load-avatar.js';
import {FALLBACK_ASSET} from './avatar-config.js';
import {validChoice} from './character-choice.js';
import {record,parse} from '../character-profile/avatar3d-data.js';
import {restoreClothing} from '../customization/clothing.js';
let config=record();try{const saved=localStorage.getItem('ahdus.character.synthetic.3d.v2');if(saved)config=parse(saved);}catch{}
const viewport=document.getElementById('avatar');
let closed=false,view,savedClothing=null;
function teardown(){closed=true;view?.dispose();removeEventListener('message',message);removeEventListener('storage',storage);viewport.removeEventListener('pointercancel',cancel);viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointerup',up);viewport.removeEventListener('keydown',key);}
addEventListener('pagehide',teardown,{once:true});
const requested=new URLSearchParams(location.search).get('asset');
const selected=validChoice(requested)?requested:undefined;
const loaded=await loadCompanionAvatar(createAssetScene,viewport,config.avatarConfiguration,text=>{viewport.dataset.status=text;},()=>!closed,selected).catch(()=>{
 if(!closed){viewport.dataset.status='Character unavailable';parent.postMessage({channel:'ahdus-avatar',type:'ready',assetReference:null},location.origin);}
 return null;
});
view=loaded?.view;
if(loaded)viewport.dataset.asset=loaded.assetReference;
function message(event){
 if(closed||!view)return;
 if(event.source!==parent||event.origin!==location.origin||event.data?.channel!=='ahdus-avatar')return;
 const {type,value}=event.data;
 if(type==='portrait'){try{parent.postMessage({channel:'ahdus-avatar',type:'portrait',value:view.portrait()},location.origin);}catch{}return;}
 if(type==='clothing'&&event.data.assetReference===loaded?.assetReference){try{restoreClothing(view,loaded.assetReference,value);savedClothing=value;}catch{viewport.dataset.status='Saved clothing is incompatible; open Character customization to reset it.';}return;}
 if(type==='focus')viewport.focus();
 if(type==='motion'&&['Idle','Walk','Talking'].includes(value)){if(value==='Walk')view.animate(value);else view.speechState(value==='Talking');}
 if(type==='face'&&Number.isFinite(value)&&Math.abs(value)<=.3)view.face(value);
 if(type==='walk'&&Number.isFinite(value)&&Math.abs(value)<=0.6)view.moveTo([value,0,0]);
 if(type==='gesture'&&value==='point')view.gesture();
 if(type==='mouth'&&['rest','demo','AA','EE','OO'].includes(value))view.mouth(value);
}
if(!closed)addEventListener('message',message);

function storage(event){if(closed||!view||event.key!=='ahdus.character.synthetic.3d.v2')return;try{config=event.newValue?parse(event.newValue):record();if(loaded.assetReference===FALLBACK_ASSET){view.setAppearance(config.avatarConfiguration);restoreClothing(view,loaded.assetReference,savedClothing);}}catch{}}
if(!closed)addEventListener('storage',storage);

// Explicit activation only; dragging remains OrbitControls rotation.
let pressed=null;
viewport.tabIndex=0;viewport.setAttribute('role','button');viewport.setAttribute('aria-label','Character: open interaction controls');
function activate(){parent.postMessage({channel:'ahdus-avatar',type:'activate'},location.origin);}
function down(e){pressed=[e.clientX,e.clientY];}
function up(e){if(pressed&&Math.hypot(e.clientX-pressed[0],e.clientY-pressed[1])<5)activate();pressed=null;}
function cancel(){pressed=null;}
function key(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}}
if(!closed){viewport.addEventListener('pointercancel',cancel);viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointerup',up);viewport.addEventListener('keydown',key);
}

if(!closed&&view)parent.postMessage({channel:"ahdus-avatar",type:"ready",assetReference:loaded.assetReference},location.origin);
