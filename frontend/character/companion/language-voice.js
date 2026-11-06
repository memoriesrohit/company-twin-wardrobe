// Gender detection for character models and voices. Two standard voice types: male and female.
import {characterEntry} from '../avatar/character-catalog.js';
export function characterGender(assetId){
 if(!assetId) return 'male';
 const known = characterEntry(assetId);
 if(known) return known.gender;
 const id = String(assetId).toLowerCase();
 const female = id.includes('ch22') || id.includes('ch29') || id.includes('ch37') ||
                id.includes('ch46') || id.includes('claire') || id.includes('studio-v1') ||
                id.includes('avatar-02') || id.includes('avatar-04') || id.includes('avatar-05') ||
                id.includes('natalie') || id.includes('emily') || id.includes('isabella') ||
                id.includes('olivia') || id.includes('sophia') || id.includes('charlotte') ||
                id.includes('amelia') || id.includes('victoria');
 return female ? 'female' : 'male';
}

export function voiceGender(voice){
 if(!voice) return 'female';
 const desc = ((voice.name || '') + ' ' + (voice.voiceURI || '')).toLowerCase();
 if(/\b(zira|eva|jenny|aria|hazel|sonia|neerja|swara|aarohi|kalpana|ananya|samantha|victoria|karen|moira|fiona|tessa|veena|sangeeta|female|woman|girl)\b/i.test(desc)){
  return 'female';
 }
 if(/\b(david|mark|guy|george|prabhat|madhur|hemant|manohar|ravi|daniel|oliver|rishi|male|boy|man)\b/i.test(desc)){
  return 'male';
 }
 if(/female/i.test(desc)) return 'female';
 if(/male/i.test(desc)) return 'male';
 return 'female';
}

// Match actual language tags; do not silently substitute Hindi for Marathi.
export function voiceForLanguage(voices,language,preferred='',gender=''){
 const matches=voices.filter(v=>voiceLanguage(v)===language);
 if(!matches.length) return null;
 if(preferred){
  const match = matches.find(v=>v.voiceURI===preferred||v.name===preferred);
  if(match) return match;
 }
 if(gender){
  const byGender = matches.filter(v=>voiceGender(v)===gender);
  if(byGender.length) return byGender.find(v=>v.localService)||byGender[0];
 }
 return matches[0]||null;
}

export function resolveCharacterVoice(voices,language,gender='male'){
 if(!voices||!voices.length) return null;
 const exact = voiceForLanguage(voices, language, '', gender);
 if(exact && voiceGender(exact) === gender) return exact;
 if(exact) return exact;
 const sameGender = voices.filter(v=>voiceGender(v)===gender);
 if(sameGender.length){
  return sameGender.find(v=>(v.lang||'').toLowerCase().startsWith('en')&&v.localService)
      || sameGender.find(v=>(v.lang||'').toLowerCase().startsWith('en'))
      || sameGender[0];
 }
 return voices.find(v=>(v.lang||'').toLowerCase().startsWith(language)) || voices[0] || null;
}

export function voiceLanguage(voice){
 const tag=(voice.lang||'').toLowerCase().replace('_','-').split('-')[0];
 if(tag)return tag;
 const name=(voice.name||'').toLowerCase();
 if(/marathi|मराठी/.test(name))return 'mr';
 if(/hindi|हिन्दी|हिंदी/.test(name))return 'hi';
 return '';
}
export function dashboardLanguage(){try{const lang=localStorage.getItem('ahdus-language');return ['en','hi','mr'].includes(lang)?lang:'en';}catch{return 'en';}}
export function speechLocale(language){return {en:'en-IN',hi:'hi-IN',mr:'mr-IN'}[language]||'en-IN';}
