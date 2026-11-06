(function(){'use strict';
const D=globalThis.AHDUSCharacterData,R=globalThis.AHDUSCharacterRenderer,key='ahdus.character.phase3a.synthetic.v1';
const $=id=>document.getElementById(id);let record=D.create(),locked=false,storage;
const labels={face:'Face shape',hair:'Hair style',skin:'Skin tone',hairColor:'Hair color',clothing:'Clothing',color:'Clothing color',accessory:'Accessory'};
const names={skin:['Light','Warm','Medium','Deep','Dark'],hairColor:['Charcoal','Brown','Gold','Violet'],color:['Blue','Green','Violet','Amber','Rose']};
try{storage=window.localStorage;const saved=storage.getItem(key);if(saved){record=D.parse(saved);locked=true;$('save-status').textContent='Saved local appearance loaded';}}catch(error){$('save-status').textContent='Local save unavailable or invalid. Using a safe default draft.';}
const motion=globalThis.AHDUSCharacterMotion.create($('character'),$('motion-state'));
Object.entries(D.options).forEach(([k,values])=>{const label=document.createElement('label');label.textContent=labels[k];const select=document.createElement('select');select.id=k;select.setAttribute('aria-label',labels[k]);values.forEach((v,i)=>{const option=document.createElement('option');option.value=v;option.textContent=names[k]?.[i]||v[0].toUpperCase()+v.slice(1);select.append(option);});select.addEventListener('change',()=>{record.avatarConfiguration[k]=select.value;render();dirty();});label.append(select);$('fields').append(label);});
D.presets.forEach((preset,i)=>{const button=document.createElement('button');button.type='button';button.className='preset';button.setAttribute('aria-label','Select appearance '+(i+1));button.innerHTML=R.markup(preset)+'<span>Look '+(i+1)+'</span>';button.addEventListener('click',()=>{record.avatarConfiguration=D.validate(preset);render();dirty();});$('presets').append(button);});
function render(){R.render($('character'),record.avatarConfiguration);Object.keys(D.options).forEach(k=>{$(k).value=record.avatarConfiguration[k];});[...$('presets').children].forEach((b,i)=>b.setAttribute('aria-pressed',JSON.stringify(D.presets[i])===JSON.stringify(record.avatarConfiguration)?'true':'false'));$('character-data').textContent=JSON.stringify(record,null,2);}
function lock(value){locked=value;$('appearance-fields').disabled=value;[...$('presets').children].forEach(b=>b.disabled=value);$('randomize').disabled=value;$('reset').disabled=value;$('save').disabled=value;$('edit').disabled=!value;}
function dirty(){$('save-status').textContent='Unsaved changes — save to keep this local appearance';}
$('randomize').onclick=()=>{record.avatarConfiguration=D.randomize();render();dirty();};
$('reset').onclick=()=>{record=D.create();motion.reset();render();dirty();};
$('save').onclick=()=>{try{if(!storage)throw Error('Storage unavailable');storage.setItem(key,JSON.stringify(D.create(record.avatarConfiguration)));lock(true);$('save-status').textContent='Appearance saved locally — select Edit to make changes';}catch(error){$('save-status').textContent='Could not save in this browser. Your draft is still available; storage may be blocked or full.';}};
$('edit').onclick=()=>{lock(false);$('save-status').textContent='Editing saved appearance';$('face').focus();};
['idle','walk','pause'].forEach(id=>{$(id).onclick=()=>{record.animationState={idle:'idle',walk:'walking',pause:'paused'}[id];motion.set(record.animationState);render();};});
$('center').onclick=()=>{motion.reset();record.animationState='idle';render();};
window.addEventListener('pagehide',()=>motion.dispose());
window.addEventListener('pageshow',()=>motion.resume());
render();lock(locked);
})();
