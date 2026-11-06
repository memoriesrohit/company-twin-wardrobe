// Presentation-only rail: card selection never changes identity or authorization.
export function railPosition(height, card, avatarHeight){
 const bottom=Math.max(8,height-avatarHeight-12);
 return card?Math.max(8,Math.min(bottom,card.top+(card.height-avatarHeight)/2)):bottom;
}
export function positionCharacter(anchor,frame,onContext=()=>{},onControl=()=>{}){
 const main=document.querySelector('main');if(!main)return ()=>{};
 const beside=anchor.dataset?.layout==='beside';
 if(!beside){main.classList.add('ahdus-character-reserved');anchor.classList.add('ahdus-character-corner');document.body.append(anchor);}
 let selected=null,scheduled=0,controlRect=null;
 const cardKey='ahdus.character.card:'+location.pathname;
 const cards='.progress-card,.mini-progress-card,.stat-card,.stat-item,.training-card,.card,[data-character-card],[data-selected-module] article,#employee-knowledge';
 try{const index=Number(sessionStorage.getItem(cardKey));if(sessionStorage.getItem(cardKey)!==null&&Number.isInteger(index)&&index>=0)selected=document.querySelectorAll(cards)[index]||null;}catch{}
 function publish(){onContext(selected?{page:location.pathname,cardId:selected.id||'card-'+[...document.querySelectorAll(cards)].indexOf(selected),title:(selected.querySelector('h2,h3,h4,.mini-label,.stat-label')?.textContent||'Selected card').trim().slice(0,120),moduleId:selected.closest('[data-selected-module]')?.dataset.selectedModule||selected.dataset?.moduleId||null,kind:selected.id==='employee-knowledge'?'knowledge':'training'}:null);}
 function remember(){publish();try{if(selected)sessionStorage.setItem(cardKey,String([...document.querySelectorAll(cards)].indexOf(selected)));else sessionStorage.removeItem(cardKey);}catch{}}
 function update(){
  scheduled=0;
  if(selected&&!selected.isConnected&&!controlRect){selected=null;publish();}
  const r=selected?.isConnected?selected.getBoundingClientRect():controlRect;
  const visible=r&&r.bottom>0&&r.top<innerHeight?r:null;
  if(!beside)anchor.style.top=railPosition(innerHeight,visible,anchor.offsetHeight)+'px';
  // Looking toward the content is deliberate, not a wandering animation.
  frame.contentWindow?.postMessage({channel:'ahdus-avatar',type:'face',value:beside ? 0.12 : 0},location.origin);
 }
 function schedule(){if(!scheduled)scheduled=requestAnimationFrame(update);}
 function select(event){
  const control=event.target.closest('button,a,input,textarea,select,[role="button"]');
  if(control){
   if(control.matches?.('input,textarea,select')||control.disabled||control.getAttribute?.('aria-disabled')==='true')return;
   if(!onControl(control,true))return;
   selected=control;controlRect=control.getBoundingClientRect();publish();schedule();onControl(control,false);return;
  }
  controlRect=null;const card=event.target.closest(cards);selected=card===selected?null:card;remember();schedule();
 }
 function key(event){if(event.key==='Escape'){controlRect=null;selected=null;remember();schedule();}}
 document.addEventListener('click',select,true);document.addEventListener('keydown',key);
 addEventListener('scroll',schedule,true);addEventListener('resize',schedule);
 frame.addEventListener('load',update);update();publish();
 return ()=>{cancelAnimationFrame(scheduled);document.removeEventListener('click',select,true);document.removeEventListener('keydown',key);removeEventListener('scroll',schedule,true);removeEventListener('resize',schedule);frame.removeEventListener('load',update);main.classList.remove('ahdus-character-reserved');};
}

