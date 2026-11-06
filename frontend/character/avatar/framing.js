// Fit an upright full-body envelope at the current orbit angle, without zoom.
export function fullBodyDistance(aspect,fov=35,direction=[0,0,1],halfWidth=.38,halfDepth=.35,padding=1.06){
 const v=Math.tan(fov*Math.PI/360),h=v*Math.max(.1,aspect);
 const length=Math.hypot(...direction)||1,n=direction.map(x=>x/length);
 const rlength=Math.hypot(n[0],n[2])||1,r=[n[2]/rlength,0,-n[0]/rlength];
 const u=[n[1]*r[2],n[2]*r[0]-n[0]*r[2],-n[1]*r[0]];
 const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);let distance=0;
 for(const x of [-halfWidth,halfWidth])for(const y of [-1.02,1.02])for(const z of [-halfDepth,halfDepth]){
 const p=[x,y,z];distance=Math.max(distance,dot(p,n)+Math.max(Math.abs(dot(p,r))/h,Math.abs(dot(p,u))/v));
 }
 return distance*Math.max(1,padding);
}
