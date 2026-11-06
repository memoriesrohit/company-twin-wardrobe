import {createScene} from '../avatar/avatar-scene.js';
import {createAssetScene} from '../avatar/asset-scene.js';
import {record} from '../character-profile/avatar3d-data.js';
import fixture from './narration.js';

// Adapter boundary: a future authorized adapter supplies a validated timeline and
// narration buffers. This prototype only loads the bundled synthetic fixture.
const canvas=document.querySelector('#output'), ctx=canvas.getContext('2d');
const status=document.querySelector('#status'), button=document.querySelector('#record');
let view, frame, audio, recorder, objectURL, activeSources=[];
let elapsed=0, playing=false, sceneIndex=-1, timeline, buffers;
function lines(text,x,y,width,lineHeight){
 let line=''; for(const word of text.split(' ')){const next=line?`${line} ${word}`:word;if(ctx.measureText(next).width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line=word;}else line=next;}ctx.fillText(line,x,y);
}
function draw(){
 const t=playing?audio.currentTime-startTime:elapsed;
 const index=Math.max(0,timeline.scenes.findLastIndex(s=>s.start<=t));
 const scene=timeline.scenes[index];
 if(playing&&index!==sceneIndex){sceneIndex=index;view.gesture();}
 ctx.fillStyle='#101d2e';ctx.fillRect(0,0,960,540);
 const source=document.querySelector('#stage canvas');if(source)ctx.drawImage(source,20,15,360,470);
 ctx.fillStyle='#66dfd4';ctx.font='600 13px system-ui';ctx.fillText(timeline.label,405,60);
 ctx.fillStyle='#fff';ctx.font='600 30px system-ui';lines(timeline.title,405,113,510,38);
 ctx.globalAlpha=Math.min(1,Math.max(.15,(t-scene.start)/.45));
 ctx.fillStyle='#66dfd4';ctx.font='600 25px system-ui';lines(scene.title,405,225,510,33);
 ctx.fillStyle='#dce8f7';ctx.font='22px system-ui';lines(scene.text,405,295,510,32);ctx.globalAlpha=1;
 ctx.fillStyle='#20354e';ctx.fillRect(32,449,896,76);
 ctx.fillStyle='#fff';ctx.font='20px system-ui';lines(scene.text,52,477,850,27);
 ctx.fillStyle='#66dfd4';ctx.fillRect(32,531,896*Math.min(1,t/timeline.duration),3);
 frame=requestAnimationFrame(draw);
}
let startTime=0;
document.querySelector('#verify').onchange=event=>{
 const file=event.target.files[0];if(!file)return;
 if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);
 const video=document.querySelector('#playback');video.src=objectURL;video.hidden=false;
 status.textContent='Exported MP4 loaded locally. Press Play to verify; no upload occurs.';
};
try{
 timeline=fixture;
 view=await createAssetScene(document.querySelector('#stage'),record().avatarConfiguration,message=>status.textContent=message,{assetReference:record().assetReference,transparent:true});
 view.face(0);
 audio=new AudioContext();
 buffers=await Promise.all(timeline.scenes.map(s=>audio.decodeAudioData(Uint8Array.from(atob(s.audio),c=>c.charCodeAt(0)).buffer)));
 draw();button.disabled=false;status.textContent=`Ready: ${timeline.duration.toFixed(1)} seconds. Mouth movement approximates speech; not phoneme alignment.`;
}catch(error){status.textContent=`Export blocked: ${error.message}`;}
button.onclick=async()=>{
 button.disabled=true;
 try{
  await audio.resume();
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(t=>MediaRecorder.isTypeSupported(t));
  if(!mime)throw new Error('Browser has no WebM video/audio encoder');
  const destination=audio.createMediaStreamDestination(),stream=canvas.captureStream(30);
  destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{
   playing=false;elapsed=timeline.duration;view.mouth('rest');view.animate('Idle');
   activeSources.forEach(s=>s.disconnect());activeSources=[];stream.getTracks().forEach(t=>t.stop());destination.disconnect();
   if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(new Blob(chunks,{type:mime}));
   const link=document.querySelector('#download');link.href=objectURL;link.hidden=false;
   const video=document.querySelector('#playback');video.src=objectURL;video.hidden=false;
   status.textContent='Recording ready with embedded narration. Download, then convert to MP4 using FFmpeg.';button.disabled=false;
  };
  recorder.start(500);startTime=audio.currentTime+.1;playing=true;sceneIndex=-1;
  view.animate('Talking');view.mouth('demo');status.textContent='Recording real 3D frames and narration… Keep this tab visible.';
  timeline.scenes.forEach((s,i)=>{const source=audio.createBufferSource();source.buffer=buffers[i];source.connect(destination);source.connect(audio.destination);activeSources.push(source);source.start(startTime+s.start);if(i===buffers.length-1)source.onended=()=>{if(recorder.state==='recording')recorder.stop();};});
 }catch(error){status.textContent=`Export failed: ${error.message}`;playing=false;view?.mouth('rest');button.disabled=false;}
};
addEventListener('pagehide',()=>{activeSources.forEach(s=>{try{s.stop();}catch{}});if(recorder?.state==='recording')recorder.stop();cancelAnimationFrame(frame);view?.dispose();audio?.close();if(objectURL)URL.revokeObjectURL(objectURL);});
