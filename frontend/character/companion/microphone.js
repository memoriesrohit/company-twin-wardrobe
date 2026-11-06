// Browser-owned STT; no recording, upload implementation or stored audio in AHDUS.
export function createMicrophone({Recognition,onText=()=>{},onState=()=>{},onError=()=>{}}){
 let active=null,generation=0;
 function stop(){generation++;const old=active;active=null;old?.abort();onState(false);}
 function start(language='en-US'){stop();if(!Recognition)throw new Error('Speech recognition is unavailable in this browser. Use the text input.');
 const id=generation,r=new Recognition();active=r;r.continuous=false;r.interimResults=false;r.lang=['en-US','en-IN','hi-IN','mr-IN'].includes(language)?language:'en-US';
 const current=()=>active===r&&generation===id;
 r.onstart=()=>{if(current())onState(true);};
 r.onresult=e=>{if(!current())return;const text=Array.from(e.results).filter(v=>v.isFinal).map(v=>v[0].transcript).join(' ').trim();if(text)onText(text.slice(0,600));};
 r.onerror=event=>{if(current()){stop();const errors={'not-allowed':'Microphone permission was denied by the browser. Allow it for this site and retry.','service-not-allowed':'This browser does not permit its speech-recognition service. Use text input or a supported browser.','audio-capture':'No working microphone is available. Connect one and retry.','network':'The browser speech-recognition service could not be reached. Use text input.','no-speech':'No speech was detected. Press Mic to try again.'};onError(errors[event?.error]||'Microphone unavailable or permission denied. You can type instead.');}};
 r.onend=()=>{if(current()){active=null;onState(false);}};
 try{r.start();}catch(error){stop();throw error;}}
 return {start,stop};
}
