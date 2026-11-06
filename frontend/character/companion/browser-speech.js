// Browser speech only: never creates an identity or calls an AI/provider API directly.
export function createSpeech({synth,Utterance,mouth=()=>{},status=()=>{},state=()=>{},caption=()=>{},schedule=setTimeout,unschedule=clearTimeout}){
 let generation=0,active=null,timer;
 let mouthTimers=[],mouthRevision=0,paused=false;
 function clearMouth(){mouthRevision++;mouthTimers.forEach(unschedule);mouthTimers=[];}
 // Orthographic mouth groups with phoneme cues; provider word boundaries anchor timing.
 function wordMouth(text,index,current,rate=1){
  clearMouth();
  const word=text.slice(index).match(/^\S+/)?.[0]||'';
  const cues=[...word.toLowerCase()].map(c=>/[a\u0904-\u0914\u093E-\u0944\u0949-\u094C]/.test(c)?(/[ou\u0913\u0914\u094B\u094C\u0941\u0942]/.test(c)?'OO':/[eiy\u090E\u090F\u0910\u0946\u0947\u0948\u093F\u0940]/.test(c)?'EE':'AA'):/[eiy]/.test(c)?'EE':/[ou]/.test(c)?'OO':/[mbp\u092E\u092C\u092A\u092D\u092F]/.test(c)?'rest':'demo');
  if(!cues.length){mouth('demo');return;}
  const revision=mouthRevision,step=Math.max(35,Math.min(85,65/(rate||1)));
  cues.forEach((cue,i)=>{const apply=()=>{if(current()&&!paused&&revision===mouthRevision)mouth(cue);};if(i===0)apply();else mouthTimers.push(schedule(apply,i*step));});
  // Maintain natural speech movement between words instead of freezing the mouth shut.
  mouthTimers.push(schedule(()=>{if(current()&&!paused&&revision===mouthRevision)mouth('demo');},cues.length*step));
 }
 function clear(){unschedule(timer);timer=undefined;}
 function stop(){clear();clearMouth();paused=false;generation++;active=null;synth?.cancel();mouth('rest');state('idle');}
 function speak(text,voice=null,gender=null){
  stop();if(!synth||!Utterance)throw new Error('Speech is not supported by this browser.');
  if(typeof text!=='string'||!text.trim()||text.length>12000)throw new Error('Enter 1-12000 characters.');
  const id=generation,utterance=new Utterance(text);active=utterance;
  if(voice){utterance.voice=voice;if(voice.lang)utterance.lang=voice.lang;}
  if(gender==='female')utterance.pitch=1.08;
  else if(gender==='male')utterance.pitch=0.92;
  const current=()=>id===generation&&active===utterance;
  utterance.onstart=()=>{if(current()){clear();mouth('demo');state('speaking');caption(text.slice(0,240));status('Speaking. Mouth timing is approximate.');}};
  utterance.onpause=()=>{if(current()){paused=true;clearMouth();mouth('rest');state('idle');}};
  utterance.onresume=()=>{if(current()){paused=false;mouth('demo');state('speaking');}};
  utterance.onend=()=>{if(current()){clear();clearMouth();active=null;mouth('rest');state('idle');status('Speech finished.');}};
  utterance.onerror=()=>{if(current()){clear();clearMouth();active=null;mouth('rest');state('idle');status('Speech unavailable. The text remains readable.');}};
  utterance.onboundary=event=>{
   if(!current()||paused||!Number.isInteger(event.charIndex)||event.charIndex<0||event.charIndex>=text.length)return;
   caption(text.slice(event.charIndex,event.charIndex+240));
   if(!event.name||event.name==='word')wordMouth(text,event.charIndex,current,utterance.rate);
  };
  status('Starting browser speech…');
  timer=schedule(()=>{if(current()){stop();status('Browser speech did not start. Try another voice or browser.');}},8000);
  try{synth.speak(utterance);}catch(error){stop();throw error;}
 }
 return {speak,stop,pause(){paused=true;clearMouth();synth?.pause();mouth('rest');state('idle');},resume(){synth?.resume();}};
}
