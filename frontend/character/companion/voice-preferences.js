// Device preferences only; no employee identities, credentials or conversations.
const key='ahdus.character.voice.preferences.v1';
export function readVoicePreferences(language='en'){
 try{
  const v=JSON.parse(localStorage.getItem(key)||'{}')||{};
  const voices=v.voices&&typeof v.voices==='object'?v.voices:{};
  const voice=typeof voices[language]==='string'?voices[language]:typeof v.voice==='string'?v.voice:localStorage.getItem('ahdus.character.voice.v1.'+language)||'';
  return {enabled:v.enabled!==undefined?v.enabled!==false:localStorage.getItem('ahdus.character.audio-enabled.v1')!=='false',captions:v.captions!==undefined?v.captions!==false:localStorage.getItem('ahdus.character.captions.v1')!=='false',voice};
 }catch{return {enabled:true,captions:true,voice:''};}
}
export function saveVoicePreferences(value,language='en'){
 if(!['en','hi','mr'].includes(language))throw Error('Unsupported language');
 let old={};try{old=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
 const voices={};for(const lang of ['en','hi','mr'])if(typeof old.voices?.[lang]==='string')voices[lang]=old.voices[lang];
 voices[language]=String(value.voice||'');
 localStorage.setItem(key,JSON.stringify({enabled:!!value.enabled,captions:!!value.captions,voice:typeof old.voice==='string'?old.voice:String(value.voice||''),voices}));
}
