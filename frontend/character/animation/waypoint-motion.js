// Renderer-independent movement. Workplace owns path planning and collisions.
export function createWaypointMotion({speed=.5}={}) {
  if(!Number.isFinite(speed)||speed<=0)throw new Error('Invalid movement speed');
  let position=[0,0,0],queue=[];
  function point(value){if(!Array.isArray(value)||value.length!==3||value.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))throw new Error('Invalid waypoint');return [...value];}
  return {
    reset(value=[0,0,0]){position=point(value);queue=[];},
    follow(points){if(!Array.isArray(points)||points.length>256)throw new Error('Invalid path');queue=points.map(point);},
    step(seconds){
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid time step');
      let remaining=Math.min(seconds,.1)*speed,heading=null;
      while(queue.length){const target=queue[0],delta=target.map((v,i)=>v-position[i]),distance=Math.hypot(...delta);
        if(distance<1e-8){position=queue.shift();continue;}
        heading=Math.atan2(delta[0],delta[2]);
        if(remaining>=distance){position=queue.shift();remaining-=distance;}else{position=position.map((v,i)=>v+delta[i]*remaining/distance);break;}
      }
      return {position:[...position],heading,moving:queue.length>0};
    },
  };
}
