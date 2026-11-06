// Presentation flag only: never identity, authorization or conversation history.
export function claimGreeting(storage,referrer,navigationType,origin){
 const key='ahdus.character.greeted.v1';
 try{
  const from=new URL(referrer||origin);
  if(navigationType==='navigate'&&from.origin===origin&&from.pathname.endsWith('/authentication/login.html'))storage.removeItem(key);
  if(storage.getItem(key))return false;
  storage.setItem(key,'1');return true;
 }catch{return false;}
}

export function greetingText(name,language='en'){
 const clean=typeof name==='string'?name.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,200):'';
 if(language==='hi')return `नमस्ते${clean?' '+clean:''}, मैं आपका सीखने का साथी हूँ।`;
 if(language==='mr')return `नमस्कार${clean?' '+clean:''}, मी तुमचा शिक्षण साथी आहे.`;
 return clean?`Hi ${clean}, I am your learning companion.`:'Hi, I am your learning companion.';
}
