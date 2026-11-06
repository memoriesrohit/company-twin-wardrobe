// Curated interface help only. Never interpret page text as company knowledge.
export function sectionIntroduction(path){
 if(path.startsWith('/frontend/training-platform/videos/'))return 'This is Training. Open a published module to find its videos, audio and documents. Complete the required material, then use the assessment link to test your understanding. Opening a module alone does not complete it.';
 if(path.startsWith('/frontend/training-platform/assessments/'))return 'This is Assessments. Choose an available assessment for your Training module, answer the questions and submit your attempt. Your results are recorded by the Training service.';
 if(path.startsWith('/frontend/training-platform/progress/'))return 'This is Results. Review your recorded assessment attempts and any certificates you have earned.';
 return null;
}
export function controlExplanation({href='',label='',disabled=false},origin){
 if(disabled)return null;
 if(href){try{const url=new URL(href,origin);if(url.origin!==origin)return null;return sectionIntroduction(url.pathname);}catch{return null;}}
 const text=label.trim().replace(/\s+/g,' ');
 if(/^Open .+/i.test(text))return 'Open this module to see the learning material available to your account. I can help explain approved content when its authorized question-answer service is available.';
 if(/^(Play|Watch|Listen)(\b|$)/i.test(text))return 'Use this control to play the selected learning material. Follow the required viewing or listening steps shown by the module.';
 if(/^(Read|View document|Open document)(\b|$)/i.test(text))return 'Open the document and read its instructions. Any explanation of its contents must come from the authorized Knowledge or Training service.';
 if(/^(Take assessment|Start assessment|Start quiz)$/i.test(text))return 'This takes you to the assessment for the learning material. Read each question and submit your answers when ready.';
 if(/^Search( documents)?$/i.test(text))return 'Search filters the documents available to your account. It does not grant access to other documents.';
 if(/^(Next|Previous)$/i.test(text))return 'Use this control to move through the available list.';
 return null;
}
