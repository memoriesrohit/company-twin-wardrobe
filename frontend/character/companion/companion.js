import {localizeGuide} from './guide-translations.js';
import {voiceForLanguage,dashboardLanguage,speechLocale,characterGender,resolveCharacterVoice} from './language-voice.js';
import {greetingText} from './greeting.js';
import {readVoicePreferences,saveVoicePreferences} from './voice-preferences.js';
import {createSpeech} from './browser-speech.js';
import {createMicrophone} from './microphone.js';
const $=id=>document.getElementById(id);
// Preferences and source IDs only; never persist answers, questions or permissions.
const continuityKey='ahdus.character.context.v1';let restored={},speakingNow=false,interruptedDuringLeave=false;
try{const saved=JSON.parse(sessionStorage.getItem(continuityKey)||'{}');if(Date.now()-saved.at<1800000)restored=saved;}catch{}
function saveContext(interrupted=false){try{sessionStorage.setItem(continuityKey,JSON.stringify({at:Date.now(),module:$('scope').value,document:$('document').value,interrupted}));}catch{}}

let knowledgeAllowed=false,allowed=false,answer='',sequence=0,pending=null,timer,open=false,listening=false,voices=[],history=[],scopeKey='',activeCard=null,cardAllowed=false;
function send(type,extra={}){if(parent!==window)parent.postMessage({channel:'ahdus-companion',type,...extra},location.origin);}
function state(value){const starting=value==='speaking'&&!speakingNow;speakingNow=value==='speaking';if(starting)send('gesture');$('phase').textContent=value[0].toUpperCase()+value.slice(1);send('state',{value});send('avatar-motion',{value:value==='speaking'?'Talking':'Idle'});}
function caption(text){send('caption',{text:$('captions').checked?text:''});}
let speechLanguage=dashboardLanguage(),answerLanguage=speechLanguage,pendingVoice=false,voiceTimer,presentation='',guideSource='',employeeName='',currentCharacter='rocketbox:sophia-v1';
const synth=window.speechSynthesis;
const speech=createSpeech({synth,Utterance:window.SpeechSynthesisUtterance,mouth:value=>send('avatar-mouth',{value}),state,caption,status:text=>{$('speech-status').textContent=text;}});
function stop(){pendingVoice=false;clearTimeout(voiceTimer);microphone.stop();speech.stop();}
function reportIssue(text){$('speech-status').textContent=text;$('phase').textContent='Needs attention';}
function setDock(value){open=value;$('dock').hidden=!open;$('toggle').setAttribute('aria-expanded',String(open));$('toggle').setAttribute('aria-label',open?'Close interaction controls':'Open interaction controls');send('dock',{open});if(open)$('toggle').focus?.();}
const microphone=createMicrophone({Recognition:window.SpeechRecognition||window.webkitSpeechRecognition,onText:text=>{$('question').value=text;ask();},onState:value=>{listening=value;$('mic').setAttribute('aria-pressed',String(value));$('mic').setAttribute('aria-label',value?'Stop microphone':'Start microphone');if(pending===null)state(value?'listening':'idle');},onError:text=>{reportIssue(text);}});
function listVoices(){voices=synth?.getVoices()||[];$('voice').replaceChildren();voices.forEach((v,i)=>{const o=document.createElement('option');o.value=i;o.textContent=v.name+' ('+v.lang+(v.localService?', local':', online')+')';$('voice').append(o);});}
function voicesChanged(){listVoices();if(pendingVoice&&voiceForLanguage(voices,answerLanguage,readVoicePreferences(answerLanguage).voice)){pendingVoice=false;clearTimeout(voiceTimer);speak();}}
listVoices();synth?.addEventListener('voiceschanged',voicesChanged);
function speak(){const preferences=readVoicePreferences(answerLanguage);$('audio-enabled').checked=preferences.enabled;$('captions').checked=preferences.captions;if(!answer)return;caption(answer);if(!preferences.enabled){$('speech-status').textContent='Audio is muted. Captions remain available.';return;}const getGender=(typeof characterGender==='function'?characterGender:(id=>'male'));
 const getVoice=(typeof resolveCharacterVoice==='function'?resolveCharacterVoice:voiceForLanguage);
 const gender=getGender(currentCharacter);
 const chosen=getVoice(voices,answerLanguage,gender)||voiceForLanguage(voices,answerLanguage,preferences.voice,gender);if(!chosen){pendingVoice=true;clearTimeout(voiceTimer);voiceTimer=setTimeout(()=>{pendingVoice=false;},5000);$('speech-status').textContent='No matching '+answerLanguage+' voice is available. Captions remain available.';return;}pendingVoice=false;clearTimeout(voiceTimer);try{speech.speak(answer,chosen,gender);}catch(e){$('speech-status').textContent=e.message;}}

function remember(label,text){const article=document.createElement('article');article.textContent=label+': '+text;$('history').append(article);while($('history').children.length>12)$('history').firstChild.remove();}
function show(text,sources=[],language=speechLanguage,autoplay=true){answerLanguage=language;answer=text;$('answer').textContent=text;$('sources').replaceChildren();for(const source of sources){const d=document.createElement('details'),title=document.createElement('summary'),p=document.createElement('p');title.textContent=source.name+(source.page?' — page '+source.page:'');p.textContent=source.excerpt;d.append(title,p);$('sources').append(d);}remember('Character',text);$('speak').disabled=!synth||!$('audio-enabled').checked||!answer;if(autoplay)speak();}
function ask(documentId=null){if(!allowed||pending!==null)return;const question=documentId?'Teach this approved document':$('question').value.trim();if(question.length<3)return;
 stop();const key=documentId||$('scope').value||'knowledge';if(key!==scopeKey){history=[];scopeKey=key;}
 // User questions only, bounded and re-retrieved through the authorized endpoint.
 const context=history.slice(-2).join(' / ').slice(-300);const contextual=context?'Previous questions: '+context+' / Current question: '+question:question;
 history.push(question);history=history.slice(-2);remember('You',question);$('question').value='';answer='';$('speak').disabled=true;$('submit').disabled=true;$('teach').disabled=true;pending=++sequence;state('thinking');
 clearTimeout(timer);timer=setTimeout(()=>{pending=null;state('idle');$('submit').disabled=!allowed;$('teach').disabled=!!activeCard||!knowledgeAllowed;$('answer').textContent='Request timed out. Retry.';},45000);
 send('ask',{id:pending,question:contextual.slice(0,1000),moduleId:activeCard?activeCard.moduleId:documentId?null:$('scope').value,documentId:activeCard?null:documentId});}
$('ask').onsubmit=e=>{e.preventDefault();ask();};$('teach').onclick=()=>{if(knowledgeAllowed&&$('document').value)ask($('document').value);};
$('mic').onclick=()=>{if(!allowed||pending!==null)return;if(listening){microphone.stop();return;}speech.stop();try{microphone.start(speechLocale(speechLanguage));}catch(e){reportIssue(e.message);}};
$('toggle').onclick=()=>setDock(!open);$('stop').onclick=stop;$('speak').onclick=speak;$('pause').onclick=()=>speech.pause();$('resume').onclick=()=>speech.resume();$('walk').onclick=()=>send('walk');$('guide').onclick=()=>{stop();send('guide');};
$('mute').onclick=()=>{$('audio-enabled').checked=!$('audio-enabled').checked;$('audio-enabled').onchange();};
$('audio-enabled').onchange=()=>{try{saveVoicePreferences({...readVoicePreferences(speechLanguage),enabled:$('audio-enabled').checked},speechLanguage);}catch{}$('mute').textContent=$('audio-enabled').checked?'Mute':'Muted';$('mute').setAttribute('aria-pressed',String(!$('audio-enabled').checked));$('mute').setAttribute('aria-label',$('audio-enabled').checked?'Mute spoken answers':'Enable spoken answers');if(!$('audio-enabled').checked)stop();$('speak').disabled=!synth||!answer||!$('audio-enabled').checked;};$('captions').onchange=()=>{try{saveVoicePreferences({...readVoicePreferences(speechLanguage),captions:$('captions').checked},speechLanguage);}catch{}caption('');};
function permission(value){allowed=activeCard?cardAllowed:value;$('submit').disabled=!allowed||pending!==null;$('mic').disabled=!allowed;$('teach').disabled=!!activeCard||!knowledgeAllowed;$('speech-status').textContent=allowed?'Authorized source selected.':'Conversation is not enabled for this source.';}
$('scope').onchange=()=>{saveContext();stop();clearTimeout(timer);pending=null;history=[];answer='';$('answer').textContent='Choose a question for this source.';$('sources').replaceChildren();$('history').replaceChildren();caption('');permission(false);if($('scope').value)send('scope-status',{moduleId:$('scope').value});else permission(knowledgeAllowed);};
$('document').onchange=()=>saveContext();
function shutdown(){interruptedDuringLeave ||= speakingNow;if(interruptedDuringLeave)saveContext(true);clearTimeout(timer);pending=null;stop();history=[];answer='';$('history').replaceChildren();$('answer').textContent='Session ended.';$('sources').replaceChildren();allowed=false;$('mic').disabled=true;$('submit').disabled=true;$('teach').disabled=true;caption('');}
function applyLanguage(language){
 if(!['en','hi','mr'].includes(language)||language===speechLanguage)return;
 stop();speechLanguage=language;clearTimeout(timer);pending=null;sequence++;
 $('submit').disabled=!allowed;$('mic').disabled=!allowed;caption('');
 if(presentation==='greeting')show(greetingText(employeeName,language),[],language,false);
 else if(presentation==='guide'){const text=localizeGuide(guideSource,language);show(text,[],text===guideSource?'en':language,false);}
 else if(presentation==='answer'||presentation==='summary'){answer='';$('speak').disabled=true;}
 $('speech-status').textContent='Voice language follows dashboard: '+language+'.';
}
function storagePreferences(event){
 if(event.key==='ahdus-language')applyLanguage(dashboardLanguage());
 if(event.key==='ahdus.character.voice.preferences.v1'){
  const p=readVoicePreferences(speechLanguage);$('audio-enabled').checked=p.enabled;$('captions').checked=p.captions;
  if(!p.enabled)stop();if(!p.captions)caption('');
 }
}
addEventListener('storage',storagePreferences);
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.channel!=='ahdus-companion')return;const d=event.data;
 if(d.type==='layout'&&d.value==='beside'){document.documentElement.classList.add('beside-learning');return;}
 if(d.type==='character-loaded'&&d.assetReference){currentCharacter=d.assetReference;return;}
 if(d.type==='character-account'&&d.assetReference){currentCharacter=d.assetReference;return;}
 if(d.type==='language-change'){applyLanguage(d.language);return;}
 if(d.type==='summary-speak'&&typeof d.text==='string'&&d.text.length<=5000&&['en','hi','mr'].includes(d.language)){stop();presentation='summary';show(d.text,[],d.language);caption(d.text);return;}
 if(d.type==='greeting'){if(pending!==null||listening||speakingNow)return;presentation='greeting';employeeName=d.employeeName;show(greetingText(employeeName,speechLanguage));if(!$('audio-enabled').checked)caption(answer);return;}
 if(d.type==='toggle-controls'){setDock(!open);return;}
 if(d.type==='card-context'){
 stop();clearTimeout(timer);pending=null;sequence++;history=[];answer='';activeCard=d.context;cardAllowed=d.allowed===true;
 $('history').replaceChildren();$('sources').replaceChildren();$('question').value='';$('speak').disabled=true;caption('');
 $('card-context').textContent=activeCard?'Selected: '+activeCard.title:'';
 $('scope').disabled=!!activeCard;$('document').disabled=!!activeCard;
 $('answer').textContent=activeCard?(cardAllowed?'Ask about the selected authorized module.':'No authorized question-answer API is available for this card. Card selection does not grant access.'):'Choose an authorized source.';
 permission(activeCard?cardAllowed:knowledgeAllowed);$('teach').disabled=!!activeCard||!knowledgeAllowed;if(!activeCard)$('scope').onchange();return;
 }
 if(d.type==='shutdown'){shutdown();return;}
 if(d.type==='conversation-status'){knowledgeAllowed=d.allowed===true;if(!$('scope').value)permission(knowledgeAllowed);return;}
 if(d.type==='scope-status'){if(d.moduleId===$('scope').value)permission(d.allowed===true);return;}
 if(d.type==='modules'||d.type==='documents'){const target=$(d.type==='modules'?'scope':'document');for(const value of (d.modules||d.documents||[])){const o=document.createElement('option');o.value=value.id;o.textContent=value.title;target.append(o);}const saved=d.type==='modules'?restored.module:restored.document;
 if(saved&&(d.modules||d.documents||[]).some(v=>v.id===saved)){target.value=saved;if(d.type==='modules')$('scope').onchange();}
 if(restored.interrupted)$('answer').textContent='Speech stopped during navigation. Select an approved document and use Explain document to restart it, or ask your question again. Nothing is replayed automatically.';
 return;}
 if(d.type==='guide'){if(d.automatic&&(pending!==null||listening))return;stop();presentation='guide';guideSource=d.answer;const localized=localizeGuide(d.answer,speechLanguage);show(localized,[],localized===d.answer?'en':speechLanguage);caption(localized);return;}
 if(d.type!=='answer'||d.id!==pending)return;clearTimeout(timer);pending=null;state('idle');$('submit').disabled=!allowed;$('teach').disabled=!!activeCard||!knowledgeAllowed;
 if(d.error){$('answer').textContent=d.error;reportIssue(d.error);return;}presentation='answer';show(typeof d.answer==='string'?d.answer:'No supporting answer.',d.sources||[],d.language||'en',!d.translationUnavailable);if(d.translationUnavailable){caption(answer);$('speech-status').textContent='Translation unavailable. Original answer is shown; it was not spoken in the wrong language.';}
});
addEventListener('pagehide',()=>{saveContext(speakingNow||interruptedDuringLeave);shutdown();synth?.removeEventListener('voiceschanged',voicesChanged);removeEventListener('storage',storagePreferences);});document.addEventListener('visibilitychange',()=>{if(document.hidden){interruptedDuringLeave=speakingNow;saveContext(interruptedDuringLeave);stop();}});
if(parent===window){$('speech-status').textContent='Open from an authorized AHDUS page.';}

document.addEventListener('keydown',event=>{if(event.key==='Escape')setDock(false);});

send("ready");
const dockSizer=new ResizeObserver(()=>{if(open)send('dock-size',{height:Math.ceil($('dock').getBoundingClientRect().height+12)});});dockSizer.observe($('dock'));addEventListener('pagehide',()=>dockSizer.disconnect(),{once:true});
