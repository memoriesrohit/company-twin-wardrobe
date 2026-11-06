// Conservative casual fallback. A missing company answer never becomes general AI.
export function casualQuestion(question){
 const q=question.split(' / Current question: ').at(-1).trim().toLowerCase().replace(/[.!?]+$/,'');
 // General conversation is broad; explicit internal-business requests stay grounded.
 return !/\b(company|payroll|salary|employee|employees|policy|policies|sop|internal|confidential|permission|certificate|leave|our|organization|training|document|ignore.*rules|reveal.*secrets)\b/.test(q);
}
export async function answerConversation(request,api,question,isCurrent=()=>true){
 const result=await request(api+'/knowledge/ask',{question});
 if(!isCurrent())return null;
 if(result.sources?.length||!casualQuestion(question))return result;
 return request(api+'/knowledge/general-learning',{question});
}
