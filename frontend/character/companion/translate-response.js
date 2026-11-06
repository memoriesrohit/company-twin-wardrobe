// Called only after the authorized Q&A response, using the existing translation API.
// Source metadata remains unchanged. No browser persistence or provider key.
export async function translateResponse(request,api,result,language,isCurrent){
 if(!isCurrent())return null;
 if(language==='en')return {...result,language};
 if(!['hi','mr'].includes(language)||typeof result.answer!=='string'||result.answer.length>12000)return {...result,language:'en',translationUnavailable:true};
 const chunks=[];let remaining=result.answer;
 while(remaining){let end=Math.min(1800,remaining.length);if(end<remaining.length){const boundary=remaining.lastIndexOf(' ',end);if(boundary>900)end=boundary;}chunks.push(remaining.slice(0,end));remaining=remaining.slice(end);}
 try{
  const translated=await request(api+'/training/translate',{language,texts:chunks});
  if(!isCurrent())return null;
  if(translated.fallback||translated.language!==language||!Array.isArray(translated.texts)||translated.texts.length!==chunks.length||translated.texts.some(t=>typeof t!=='string')||translated.texts.join(' ').length>12000)throw Error('Translation unavailable');
  return {...result,answer:translated.texts.join(' '),language};
 }catch{if(!isCurrent())return null;return {...result,language:'en',translationUnavailable:true};}
}
