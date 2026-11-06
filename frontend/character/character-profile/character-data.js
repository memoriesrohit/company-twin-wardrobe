(function(root){
'use strict';
const options=Object.freeze({face:['round','oval','square'],hair:['short','bob','curls','bald'],skin:['#f3e7d3','#ddb896','#c68642','#8d5524','#5c3317'],hairColor:['#2c3e50','#8b4513','#daa520','#9b59b6'],clothing:['jacket','shirt','sweater'],color:['#3b82f6','#10b981','#a855f7','#f59e0b','#e85d75'],accessory:['none','glasses','headphones']});
const presets=[{face:'round',hair:'short',skin:options.skin[1],hairColor:options.hairColor[0],clothing:'jacket',color:options.color[0],accessory:'glasses'},{face:'oval',hair:'bob',skin:options.skin[3],hairColor:options.hairColor[1],clothing:'shirt',color:options.color[1],accessory:'none'},{face:'square',hair:'curls',skin:options.skin[4],hairColor:options.hairColor[0],clothing:'sweater',color:options.color[2],accessory:'headphones'},{face:'round',hair:'bald',skin:options.skin[0],hairColor:options.hairColor[2],clothing:'jacket',color:options.color[3],accessory:'none'}];
function validate(config){if(!config || Object.keys(options).some(k=>!options[k].includes(config[k])))throw Error('Unsupported appearance');return Object.fromEntries(Object.keys(options).map(k=>[k,config[k]]));}
function create(config=presets[0]){return {schemaVersion:1,characterId:'synthetic-character-001',employeeId:'synthetic-employee-001',avatarConfiguration:validate(config),assetReference:'original-svg:ahdus-modular-v1',animationState:'idle'};}
function parse(value){const c=JSON.parse(value);if(c.schemaVersion!==1||c.employeeId!=='synthetic-employee-001'||c.characterId!=='synthetic-character-001'||c.assetReference!=='original-svg:ahdus-modular-v1')throw Error('Unsupported local character');return create(c.avatarConfiguration);}
function randomize(random=Math.random){return Object.fromEntries(Object.entries(options).map(([k,v])=>[k,v[Math.min(v.length-1,Math.floor(random()*v.length))]]));}
root.AHDUSCharacterData={options,presets,validate,create,parse,randomize};
if(typeof module!=='undefined')module.exports=root.AHDUSCharacterData;
})(globalThis);
