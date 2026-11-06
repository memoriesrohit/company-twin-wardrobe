(function(root){'use strict';
function create(element,readout){let x=50,direction=1,state='idle',last=0,frame,running=true;
function show(){element.style.left=x+'%';element.dataset.animation=state;readout.textContent=`${state==='walking'?'Walking':state==='paused'?'Paused':'Idle'} · preview position ${Math.round(x)}%`;}
function tick(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(state==='walking'&&!document.hidden){x+=direction*dt*13;if(x>=72){x=72;direction=-1;}if(x<=28){x=28;direction=1;}show();}frame=requestAnimationFrame(tick);}
show();frame=requestAnimationFrame(tick);
return {set(next){if(!['idle','walking','paused'].includes(next))throw Error('Invalid animation');state=next;show();},reset(){x=50;direction=1;state='idle';show();},dispose(){running=false;cancelAnimationFrame(frame);},resume(){if(!running){running=true;last=0;frame=requestAnimationFrame(tick);}},getState(){return {state,x};}};}
root.AHDUSCharacterMotion={create};
})(globalThis);
