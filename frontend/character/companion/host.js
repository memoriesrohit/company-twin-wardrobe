import {dashboardLanguage} from './language-voice.js';
import {translateResponse} from './translate-response.js';
import {answerConversation} from './conversation-routing.js';
import {positionCharacter} from './positioning.js';
import {createFocusMode} from './focus-mode.js';
import {mountLearningLayout} from './learning-layout.js';
import {claimGreeting} from './greeting.js';
import {validChoice} from './character-choice.js';
import {sectionIntroduction,controlExplanation} from './interface-guide.js';
// Presentation only. Existing session and Knowledge endpoints retain all authority.
export function mount({api,isCurrent,request}){
 const profileName=request(api+'/character/profile-name').then(data=>{if(!isCurrent()||typeof data.name!=='string')return '';for(const id of ['sidebar-username','welcome-name']){const target=document.getElementById(id);if(target){target.dataset.noTranslate='true';target.textContent=data.name;}}return data.name;}).catch(()=>'');
 const stage=document.createElement('section');stage.className='ahdus-character-stage';stage.setAttribute('aria-label','Character viewport and controls');(document.querySelector('main')||document.body).append(stage);
 const anchor=document.createElement('div');anchor.className='ahdus-avatar-presence';stage.append(anchor);
 const styles=document.createElement('link');styles.rel='stylesheet';styles.href='/frontend/character/companion/presence.css';document.head.append(styles);
 const captions=document.createElement('div');captions.className='ahdus-subtitles';captions.setAttribute('role','status');captions.setAttribute('aria-live','polite');captions.hidden=true;stage.append(captions);
 const learningLayout=mountLearningLayout(stage,anchor);
 let cardContext=null,contextRevision=0,choiceRevision=0,choicePending=false,choiceState=null;
 function sendChoice(){if(choiceState)frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'character-account',...choiceState},location.origin);}
 async function loadChoice(){const revision=choiceRevision;try{const data=await request(api+'/character/selection');if(!isCurrent()||revision!==choiceRevision)return;choiceState={assetReference:data.asset_reference,clothing:data.clothing||null,available:true};if(validChoice(data.asset_reference))avatarFrame.src='/frontend/character/companion/avatar.html?asset='+encodeURIComponent(data.asset_reference);}catch(error){if(!isCurrent())return;choiceState={available:false,error:error.message};if(revision===choiceRevision&&avatarFrame)avatarFrame.src='/frontend/character/companion/avatar.html';}sendChoice();}
 function restoreAccountClothing(assetReference){if(choiceState?.assetReference===assetReference&&choiceState.clothing)avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'clothing',assetReference,value:choiceState.clothing},location.origin);}
 async function selectCard(context){cardContext=context;const revision=++contextRevision;busy=false;sendCard(false);if(!context||(context.kind!=='knowledge'&&(!context.moduleId||!/^[0-9a-f-]{36}$/i.test(context.moduleId))))return;try{const status=await request(api+(context.kind==='knowledge'?'/knowledge/conversation-status':'/training/modules/'+encodeURIComponent(context.moduleId)+'/conversation-status'));if(revision===contextRevision&&isCurrent())sendCard(status.allowed===true);}catch{}}
 function sendCard(allowed){frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'card-context',context:cardContext,revision:contextRevision,allowed},location.origin);}
 const focusMode=createFocusMode(stage,anchor,()=>frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'toggle-controls'},location.origin));
 function focusMessage(event){if(isCurrent()&&event.origin===location.origin&&event.source===avatarFrame?.contentWindow&&event.data?.channel==='ahdus-avatar'&&event.data.type==='portrait'&&typeof event.data.value==='string'&&event.data.value.startsWith('data:image/png;base64,')){const circle=document.getElementById('sidebar-avatar');if(circle){const image=document.createElement('img');image.src=event.data.value;image.alt='Your selected character';image.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';circle.replaceChildren(image);}return;}if(isCurrent()&&event.origin===location.origin&&event.source===avatarFrame?.contentWindow&&event.data?.channel==='ahdus-avatar'&&event.data.type==='activate')focusMode.toggle();}
 let stopPositioning=()=>{};
 let captionTimer,greetingTimer,avatarReady=false,dockReady=false,greetingChecked=false,frame=null,avatarFrame=null,left=false,busy=false;
 function greet(){
  if(!avatarReady||!dockReady||greetingChecked||!isCurrent())return;
  greetingChecked=true;
  const introduction=sectionIntroduction(location.pathname||'');
  if(introduction){explain(introduction);return;}
  let claimed=false;
  try{claimed=claimGreeting(sessionStorage,document.referrer,performance.getEntriesByType('navigation')[0]?.type,location.origin);}catch{}
  if(!claimed)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'walk',value:.3},location.origin);
  greetingTimer=setTimeout(async()=>{const employeeName=await profileName;if(!isCurrent()||!frame||!avatarFrame)return;avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'gesture',value:'point'},location.origin);frame.contentWindow.postMessage({channel:'ahdus-companion',type:'greeting',employeeName},location.origin);},reduced?0:1600);
 }
 function explain(answer){
  if(!isCurrent()||!dockReady||!avatarReady)return;
  avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'gesture',value:'point'},location.origin);
  frame.contentWindow.postMessage({channel:'ahdus-companion',type:'guide',answer,automatic:true},location.origin);
 }
 function selectedControl(control,checkOnly=false){
  const answer=controlExplanation({href:control.getAttribute('href')||'',label:control.getAttribute('aria-label')||control.textContent||'',disabled:control.disabled},location.origin);
  if(!answer)return false;
  // Let normal navigation/form behavior continue. The destination introduces
  // itself after its authorized companion is ready; no speech is persisted.
  const href=control.getAttribute('href');
  if(!checkOnly&&!href)explain(answer);
  return true;
 }
 function removeAvatar(){clearTimeout(captionTimer);avatarFrame?.remove();avatarFrame=null;}
 function addAvatar(){avatarFrame=document.createElement('iframe');avatarFrame.setAttribute('aria-label','AHDUS walking avatar');avatarFrame.style.cssText='display:block;width:100%;height:100%;border:0;background:transparent;pointer-events:auto';anchor.append(avatarFrame);}

 function walk(){if(!avatarFrame)return;left=!left;avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'walk',value:left?0.6:-0.6},location.origin);}
 function sendLanguage(){const language=dashboardLanguage();if(isCurrent()&&['en','hi','mr'].includes(language))frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'language-change',language},location.origin);}
 let pendingSummary=null,speechMouthTimers=[];
 function clearSpeechMouth(){speechMouthTimers.forEach(clearTimeout);speechMouthTimers=[];}
 function handleAvatarSpeech(event){
  if(!isCurrent()||!avatarFrame?.contentWindow)return;
  const d=event.detail;
  if(d.type==='start'){
   clearSpeechMouth();
   avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'motion',value:'Talking'},location.origin);
   avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:'demo'},location.origin);
  }else if(d.type==='word'&&typeof d.word==='string'){
   clearSpeechMouth();
   const cues=[...d.word.toLowerCase()].map(c=>/[a\u0904-\u0914\u093E-\u0944\u0949-\u094C]/.test(c)?(/[ou\u0913\u0914\u094B\u094C\u0941\u0942]/.test(c)?'OO':/[eiy\u090E\u090F\u0910\u0946\u0947\u0948\u093F\u0940]/.test(c)?'EE':'AA'):/[eiy]/.test(c)?'EE':/[ou]/.test(c)?'OO':/[mbp\u092E\u092C\u092A\u092D\u092F]/.test(c)?'rest':'demo');
   const step=65;
   cues.forEach((cue,i)=>{
    if(i===0)avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:cue},location.origin);
    else speechMouthTimers.push(setTimeout(()=>{avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:cue},location.origin);},i*step));
   });
   speechMouthTimers.push(setTimeout(()=>{avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:'demo'},location.origin);},cues.length*step));
  }else if(d.type==='end'){
   clearSpeechMouth();
   avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:'rest'},location.origin);
   avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'motion',value:'Idle'},location.origin);
  }
 }
 function speakSummary(event){
  const d=event.detail;
  if(!isCurrent()||typeof d?.text!=='string'||d.text.length>5000)return;
  const langMap={english:'en',hindi:'hi',marathi:'mr',en:'en',hi:'hi',mr:'mr'};
  const language=langMap[(d.language||'').toLowerCase()]||(['en','hi','mr'].includes(d.language)?d.language:'en');
  event.preventDefault();
  if(dockReady&&frame?.contentWindow){
   frame.contentWindow.postMessage({channel:'ahdus-companion',type:'summary-speak',text:d.text,language},location.origin);
  }else{
   pendingSummary={text:d.text,language};
   avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'motion',value:'Talking'},location.origin);
   avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'mouth',value:'demo'},location.origin);
  }
 }
 function languageStorage(event){if(event.key==='ahdus-language')sendLanguage();}
 window.addEventListener('storage',languageStorage);
 window.addEventListener('ahdus:language-change',sendLanguage);
 window.addEventListener('ahdus:speak-summary',speakSummary);
 window.addEventListener('ahdus:avatar-speech',handleAvatarSpeech);
 function open(){if(!isCurrent()||frame)return;frame=document.createElement('iframe');frame.title='AHDUS learning companion';frame.src='/frontend/character/companion/index.html';frame.className='ahdus-interaction-dock';frame.allow='microphone';frame.style.cssText='display:none;width:100%;min-width:0;height:0;border:0;background:transparent';frame.hidden=true;stage.append(frame);const target=frame;frame.onload=async()=>{sendCard(false);if(cardContext)selectCard(cardContext);try{const status=await request(api+'/knowledge/conversation-status');if(isCurrent()&&frame===target)target.contentWindow.postMessage({channel:'ahdus-companion',type:'conversation-status',allowed:status.allowed===true},location.origin);}catch{}try{const knowledge=await request(api+'/knowledge/documents');if(isCurrent()&&frame===target)target.contentWindow.postMessage({channel:'ahdus-companion',type:'documents',documents:knowledge.documents.filter(d=>d.knowledge_state==='APPROVED').map(d=>({id:d.id,title:d.filename}))},location.origin);}catch{}try{const data=await request(api+'/training/modules');if(isCurrent()&&frame===target)target.contentWindow.postMessage({channel:'ahdus-companion',type:'modules',modules:data.modules.filter(m=>m.publication_state==='PUBLISHED').map(m=>({id:m.id,title:m.title}))},location.origin);}catch{}};}
 async function message(event){if(event.origin===location.origin&&isCurrent()&&event.data?.type==='ready'){if(event.source===avatarFrame?.contentWindow&&event.data.channel==='ahdus-avatar'){avatarReady=true;avatarFrame.contentWindow.postMessage({channel:'ahdus-avatar',type:'portrait'},location.origin);restoreAccountClothing(event.data.assetReference);frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'character-loaded',assetReference:event.data.assetReference},location.origin);}if(event.source===frame?.contentWindow&&event.data.channel==='ahdus-companion'){dockReady=true;if(learningLayout)frame.contentWindow.postMessage({channel:'ahdus-companion',type:'layout',value:'beside'},location.origin);sendLanguage();sendChoice();if(pendingSummary){frame.contentWindow.postMessage({channel:'ahdus-companion',type:'summary-speak',...pendingSummary},location.origin);pendingSummary=null;}}greet();return;}if(avatarFrame&&event.source===avatarFrame.contentWindow&&event.origin===location.origin&&event.data?.channel==='ahdus-avatar'&&event.data.type==='activate'&&isCurrent()){return;}if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||event.data?.channel!=='ahdus-companion'||!isCurrent())return;const data=event.data;
 if(data.type==='character-selection'){
 if(!validChoice(data.assetReference)||choicePending)return;
 const revision=++choiceRevision;choicePending=true;
 try{
  if(data.save){await request(api+'/character/selection',{asset_reference:data.assetReference});const saved=await request(api+'/character/selection');if(revision===choiceRevision)choiceState={assetReference:saved.asset_reference,clothing:saved.clothing||null,available:true};}
  if(!isCurrent()||revision!==choiceRevision)return;
  clearTimeout(greetingTimer);avatarReady=false;
  if(avatarFrame)avatarFrame.src='/frontend/character/companion/avatar.html?asset='+encodeURIComponent(data.assetReference);
  frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'character-result',saved:data.save===true},location.origin);
 }catch(error){if(isCurrent())frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'character-result',error:error.message},location.origin);}
 finally{choicePending=false;}
 return;
 } if(data.type==='scope-status'){
 const target=frame.contentWindow;let allowed=false;
 try{if(typeof data.moduleId!=='string'||!/^[0-9a-f-]{36}$/i.test(data.moduleId))throw new Error('Invalid module');const status=await request(api+'/training/modules/'+encodeURIComponent(data.moduleId)+'/conversation-status');allowed=status.allowed===true;}catch{}
 if(isCurrent()&&frame?.contentWindow===target)target.postMessage({channel:'ahdus-companion',type:'scope-status',moduleId:data.moduleId,allowed},location.origin);return;
 }
 if(data.type==='caption'&&typeof data.text==='string'){clearTimeout(captionTimer);captions.textContent=data.text.slice(0,360);captions.hidden=!data.text;captionTimer=setTimeout(()=>{captions.hidden=true;},12000);return;}
 if(data.type==='dock-size'&&Number.isFinite(data.height)){if(!frame.hidden)frame.style.height=Math.min(340,Math.max(150,data.height))+'px';return;}
 if(data.type==='dock'){frame.hidden=!data.open;frame.style.display=data.open?'block':'none';frame.style.height=data.open?'min(230px,calc(100dvh - 24px))':'0px';if(!data.open)avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'focus'},location.origin);return;}
 if(data.type==='state'&&['idle','listening','thinking','speaking'].includes(data.value)){anchor.setAttribute('data-state',data.value);if(data.value!=='speaking'){clearTimeout(captionTimer);captions.hidden=true;captions.textContent='';}return;}
 if(data.type==='gesture'){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:'gesture',value:'point'},location.origin);return;}
 if(data.type==='avatar-mouth'||data.type==='avatar-motion'){avatarFrame?.contentWindow.postMessage({channel:'ahdus-avatar',type:data.type==='avatar-mouth'?'mouth':'motion',value:data.value},location.origin);return;}
 if(data.type==='walk'){walk();return;}
 if(data.type==='guide'){
 const path=location.pathname||'';
 const guides=[
 ['/training-platform/videos/','Open a Training module to see its published video, audio and documents. Watch or listen to the required material and read the documents. Viewing evidence is saved by the platform; opening a module alone does not complete it. Use Take assessment to continue in Assessment.'],
 ['/training-platform/assessments/','Select the assessment attached to your Training module, answer its questions and submit. The server scores and saves your attempt. Required assessments and scenarios must each reach 70 percent, and required viewing must be complete before a module certificate is eligible.'],
 ['/training-platform/progress/','Results shows saved assessment attempts and issued module certificates. Check the module and attempt time. A certificate requires all mandatory viewing and passing every required assessment and scenario; watching a video alone is not enough.'],
 ['/training-platform/scenario-training/','Read the workplace scenario and explain what action you would take using the approved Training material. Submit your response for evaluation and feedback. Scenario learning is separate from factual quiz questions.'],
 ['/employee/','Use Training to choose a published module, Assessment to take its quizzes, and Results to review saved outcomes and certificates. For teaching, choose Approved Knowledge or a published Training module below and ask a specific question. Answers use only authorized source material.'],
 ['/admin/','Use your Admin Panel to manage only your assigned departments. Prepare Training content, generate and review assessments and scenarios, then publish the ready module. Employee progress is available on demand. Knowledge documents require Super Admin review.'],
 ['/superadmin/','Use your organization controls to manage Admin department assignments, review Knowledge submissions and inspect activity. Your authority is restricted to your assigned organization.']
 ];
 const answer=guides.find(([prefix])=>path.includes(prefix))?.[1]||'Use the authorized navigation on this page. For content teaching, choose Approved Knowledge or a published Training module and ask a question. I cannot explain unpublished or unauthorized content.';
 frame.contentWindow.postMessage({channel:'ahdus-companion',type:'guide',answer},location.origin);return;
 }
 if(data.type!=='ask'||busy||typeof data.question!=='string'||data.question.trim().length<3||data.question.length>1000)return;
 const target=frame.contentWindow;const revision=contextRevision;const language=dashboardLanguage();busy=true;
 if(cardContext&&(cardContext.kind==='knowledge'?(!!data.moduleId||!!data.documentId):(!cardContext.moduleId||data.moduleId!==cardContext.moduleId||data.documentId))){busy=false;target.postMessage({channel:'ahdus-companion',type:'answer',id:data.id,error:'No authorized question-answer API is mapped to this card.'},location.origin);return;}
 try{const moduleId=data.moduleId; if(moduleId&&!/^[0-9a-f-]{36}$/i.test(moduleId))throw new Error('Invalid module');const documentId=data.documentId;if(documentId&&!/^[0-9a-f-]{36}$/i.test(documentId))throw new Error('Invalid document');const endpoint=documentId?'/knowledge/documents/'+encodeURIComponent(documentId)+'/lesson':moduleId?'/training/modules/'+encodeURIComponent(moduleId)+'/ask':'/knowledge/ask';let result=endpoint==='/knowledge/ask'?await answerConversation(request,api,data.question,()=>isCurrent()&&revision===contextRevision):await request(api+endpoint,{question:data.question});if(!result)return;result=await translateResponse(request,api,result,language,()=>isCurrent()&&revision===contextRevision&&frame?.contentWindow===target&&language===dashboardLanguage());if(!result)return;if(isCurrent()&&revision===contextRevision&&frame?.contentWindow===target)target.postMessage({channel:'ahdus-companion',type:'answer',id:data.id,answer:result.answer,sources:result.sources,language:result.language,translationUnavailable:result.translationUnavailable},location.origin);}
 catch{if(isCurrent()&&revision===contextRevision&&frame?.contentWindow===target)target.postMessage({channel:'ahdus-companion',type:'answer',id:data.id,error:'Authorized Knowledge is unavailable. Sign in again or retry; no answer was generated.'},location.origin);}
 finally{if(revision===contextRevision&&frame?.contentWindow===target)busy=false;}}
 addEventListener('message',focusMessage);addEventListener('message',message);if(isCurrent()){addAvatar();open();stopPositioning=positionCharacter(anchor,avatarFrame,selectCard,selectedControl);loadChoice();}
 return ()=>{window.removeEventListener('storage',languageStorage);window.removeEventListener('ahdus:language-change',sendLanguage);window.removeEventListener('ahdus:speak-summary',speakSummary);window.removeEventListener('ahdus:avatar-speech',handleAvatarSpeech);clearSpeechMouth();focusMode.dispose();removeEventListener('message',focusMessage);clearTimeout(greetingTimer);frame?.contentWindow.postMessage({channel:'ahdus-companion',type:'shutdown'},location.origin);window.speechSynthesis?.cancel();stopPositioning();learningLayout?.dispose();removeEventListener('message',message);frame?.remove();removeAvatar();anchor.remove();captions.remove();styles.remove();stage.remove();};
}
