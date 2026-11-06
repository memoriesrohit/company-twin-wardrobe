// Resize the existing renderer without replacing its iframe or page content.
export function createFocusMode(stage,anchor,openControls=()=>{}){
 let active=false;
 const back=document.createElement('button');back.type='button';back.className='ahdus-focus-return';back.textContent='↙ Return to normal size';back.hidden=true;stage.append(back);
 const sidebar=document.querySelector('.sidebar-footer');
 const profile=sidebar?.querySelector('[data-page="profile"],.nav-item');
 function toggleProfile(event){event.preventDefault();event.stopImmediatePropagation();location.assign('/frontend/character/selection/index.html');}
 profile?.addEventListener('click',toggleProfile,true);
 profile?.setAttribute('aria-label','Employee character and voice settings');
 function exit(){active=false;document.body.classList.remove('ahdus-avatar-focused');stage.classList.remove('ahdus-learning-focused');back.hidden=true;}
 function enter(){active=true;if(stage.dataset?.layout==='beside')stage.classList.add('ahdus-learning-focused');else document.body.classList.add('ahdus-avatar-focused');back.hidden=false;}
 function key(e){if(active&&e.key==='Escape')exit();}
 back.addEventListener('click',exit);document.addEventListener('keydown',key);
 return {enter,exit,toggle(){enter();openControls();},dispose(){exit();back.removeEventListener('click',exit);document.removeEventListener('keydown',key);back.remove();profile?.removeEventListener('click',toggleProfile,true);}};
}
