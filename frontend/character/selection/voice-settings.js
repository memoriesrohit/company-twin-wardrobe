import {dashboardLanguage,voiceLanguage} from '../companion/language-voice.js';
import {readVoicePreferences,saveVoicePreferences} from '../companion/voice-preferences.js';
const section=document.createElement('fieldset');section.innerHTML='<legend>Voice settings</legend><label><input id="settings-audio" type="checkbox"> Spoken answers</label><label><input id="settings-captions" type="checkbox"> Captions</label><label>Voice profile <select id="settings-voice"><option value="auto">Standard Character Voice (Male/Female by character)</option><option value="male">Male Voice</option><option value="female">Female Voice</option></select></label><p style="font-size:12px;color:var(--text-secondary);margin:4px 0 12px">Male characters use the standard Male voice; female characters use the standard Female voice. Both voices translate into English, Hindi, and Marathi.</p><button type="button" id="settings-save">Save voice settings</button><small id="settings-status" role="status"></small><details><summary>Conversation history</summary><p>Conversation history is currently kept only in the active page. Cross-page history requires an authorized storage contract; private conversations are not saved in browser storage.</p></details>';
section.id='voice-settings';
const sidebar=document.querySelector('aside');
sidebar.append(section);
if(['#voice-settings','#settings-audio'].includes(location.hash))requestAnimationFrame(()=>section.scrollIntoView({block:'start'}));
const audio=section.querySelector('#settings-audio'),captions=section.querySelector('#settings-captions'),voice=section.querySelector('#settings-voice'),preferences=readVoicePreferences(dashboardLanguage());
audio.checked=preferences.enabled;captions.checked=preferences.captions;
const synth=window.speechSynthesis;let selectedVoice=preferences.voice,currentLanguage=dashboardLanguage();
voice.onchange=()=>{selectedVoice=voice.value;};
function list(){
  section.querySelector('#settings-status').textContent='Voice language follows dashboard: '+currentLanguage+'. Male and Female voices translate into all 3 languages.';
  if(['male','female','auto'].includes(selectedVoice))voice.value=selectedVoice;
  else voice.value='auto';
}
list();synth?.addEventListener('voiceschanged',list);if(!synth){voice.disabled=audio.disabled=true;section.querySelector('#settings-status').textContent='Speech playback is unavailable in this browser. Captions remain available.';}
section.querySelector('#settings-save').onclick=()=>{try{saveVoicePreferences({enabled:audio.checked,captions:captions.checked,voice:voice.value},currentLanguage);section.querySelector('#settings-status').textContent='Voice preferences saved for this browser.';}catch{section.querySelector('#settings-status').textContent='Browser storage is unavailable; preferences were not saved.';}};
function languageChanged(){currentLanguage=dashboardLanguage();selectedVoice=readVoicePreferences(currentLanguage).voice;list();}
function storageChanged(event){if(event.key==='ahdus-language')languageChanged();}
addEventListener('ahdus:language-change',languageChanged);addEventListener('storage',storageChanged);
addEventListener('pagehide',()=>{synth?.removeEventListener('voiceschanged',list);removeEventListener('storage',storageChanged);removeEventListener('ahdus:language-change',languageChanged);},{once:true});
