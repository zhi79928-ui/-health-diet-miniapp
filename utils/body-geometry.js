// A compact, continuous human mesh derived from MakeHuman's CC0 base asset.
// It is an illustrative body visualizer, not a scan or medical prediction.
const asset = require('../assets/body-base-mesh');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};

function circumference(a,b) {
  const h=((a-b)/(a+b))**2;
  return Math.PI*(a+b)*(1+3*h/(10+Math.sqrt(4-3*h)));
}
function dimensions(m) {
  const height=m.height/100, scale=height/1.75;
  const fullness=clamp(Math.sqrt(m.weight/(height*height)/22.86),.72,1.68);
  const sex=m.sex==='female'?'female':'male';
  const waist=(m.waist===null?(sex==='female'?74:80)*scale*fullness:m.waist)/100;
  const waistX=waist/circumference(1,.76);
  return {height,scale,fullness,waistX,waistZ:waistX*.76,sex};
}

function decode(text,Type) {
  let buffer;
  if(typeof wx!=='undefined' && typeof wx.base64ToArrayBuffer==='function') buffer=wx.base64ToArrayBuffer(text);
  else {
    const bytes=Buffer.from(text,'base64');
    buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  }
  return new Type(buffer);
}
let base;
function source() {
  if(base)return base;
  const packed=decode(asset.positions,Int16Array),indices=decode(asset.indices,Uint16Array),regions=decode(asset.regions,Uint8Array),points=[];
  for(let i=0;i<asset.vertexCount;i++)points.push([packed[i*3]/10000,packed[i*3+1]/10000,packed[i*3+2]/10000]);
  // Keep rest-space coordinates. They are also used for stable garment and
  // hand masks after the body has been reshaped and posed.
  const waistBand=points.filter(p=>p[1]>1.09&&p[1]<1.15&&Math.abs(p[0])<.18);
  const waistX=Math.max(...waistBand.map(p=>Math.abs(p[0])));
  const zMin=Math.min(...waistBand.map(p=>p[2])),zMax=Math.max(...waistBand.map(p=>p[2]));
  const eyes=new Set();
  for(let i=0;i<indices.length;i++)if(regions[Math.floor(i/3)]===3)eyes.add(indices[i]);
  base={points,indices,regions,eyes,waistX,waistZ:(zMax-zMin)/2,waistCenterZ:(zMax+zMin)/2};
  return base;
}

function create(m) {
  const d=dimensions(m),src=source(),female=d.sex==='female',H=d.height,S=d.scale,F=d.fullness;
  const points=src.points.map((original,index)=>{
    let [x,y,z]=original;const yn=y/1.75;
    if(src.eyes.has(index)||yn>.88)return [x*S,y*S,z*S];
    // Weight changes the trunk most, limbs less. Sex changes shoulder/hip
    // distribution without pretending to infer anatomy from three numbers.
    const trunk=Math.exp(-Math.pow((yn-.64)/.20,4));
    const limb=1-trunk;
    let radial=1+(F-1)*(.72*trunk+.34*limb);
    let xScale=radial,zScale=1+(radial-1)*.92;
    const shoulders=Math.exp(-Math.pow((yn-.80)/.075,2));
    const hips=Math.exp(-Math.pow((yn-.54)/.085,2));
    const sexAmount=female?-1:1;
    xScale*=1+sexAmount*.055*shoulders-sexAmount*.045*hips;
    zScale*=1-sexAmount*.025*hips;
    x*=xScale;z=src.waistCenterZ+(z-src.waistCenterZ)*zScale;
    // Waist is the one directly measured circumference. Blend it into the
    // surrounding abdomen so front and side views both react smoothly.
    if(Math.abs(original[0])<.18) {
      const band=Math.exp(-Math.pow((yn-.64)/.065,2));
      const targetX=d.waistX/S,targetZ=d.waistZ/S;
      const currentX=src.waistX*xScale,currentZ=src.waistZ*zScale;
      x*=mix(1,targetX/currentX,band);
      z=src.waistCenterZ+(z-src.waistCenterZ)*mix(1,targetZ/currentZ,band);
    }
    // A small chest contour makes the selectable silhouettes visibly
    // different while retaining the same licensed, continuous mesh.
    if(female) {
      const chest=Math.exp(-Math.pow((yn-.75)/.055,2))*Math.exp(-Math.pow(x/.15,4));
      if(z>src.waistCenterZ)z+=.018*chest;
    }
    x*=S;y*=S;z*=S;
    // The source is an A-pose. Rotate only the arms gently around the shoulder
    // so the hands rest beside the thighs without dragging the chest inward.
    const side=Math.sign(original[0]),ax=Math.abs(original[0]);
    if(side&&original[1]>.64&&original[1]<1.53&&ax>.18) {
      const arm=smooth(.18,.29,ax)*smooth(.64,.82,original[1]);
      const angle=-side*.48*arm,pivotX=side*.185*S,pivotY=1.43*S;
      const dx=x-pivotX,dy=y-pivotY,c=Math.cos(angle),s=Math.sin(angle);
      x=pivotX+dx*c-dy*s;y=pivotY+dx*s+dy*c;
      // The rest pose also reaches slightly forward. Bring the arm back in
      // the sagittal plane so the palm falls beside the hip in side view.
      const back=.28*arm,by=y-pivotY,bz=z,c2=Math.cos(back),s2=Math.sin(back);
      y=pivotY+by*c2-bz*s2;z=by*s2+bz*c2;
    }
    return [x,y,z];
  });
  const faces=[];
  for(let i=0;i<src.indices.length;i+=3) {
    const face=[points[src.indices[i]],points[src.indices[i+1]],points[src.indices[i+2]]];
    const authored=src.regions[i/3];
    if(authored===3)face.region=3;
    else {
      const originals=[src.points[src.indices[i]],src.points[src.indices[i+1]],src.points[src.indices[i+2]]];
      const cy=originals.reduce((sum,p)=>sum+p[1],0)/(3*1.75);
      const cx=Math.abs(originals.reduce((sum,p)=>sum+p[0],0)/3);
      const hand=cx>.43&&cy>.35&&cy<.68;
      if(hand||cy>=.90||(cy>=.82&&cx<.10))face.region=0; // exposed head, neck and hands
      else if(cy>=.56)face.region=1; // long-sleeve top
      else if(cy>=.06)face.region=2; // full-length trousers
      else face.region=5;            // shoes
    }
    faces.push(face);
  }
  addShortHair(faces,H);
  faces.dimensions=d;faces.source={name:asset.source,license:asset.license};
  return faces;
}

// Clip the scalp at a curved hairline. Sharing edge intersections keeps the
// hair surface smooth; a small outward offset avoids flickering with the skin.
function addShortHair(faces,height) {
  const scale=height/1.75,raised=new Map(),edges=new Map(),ids=new Map();
  let next=0;
  const id=p=>{if(!ids.has(p))ids.set(p,next++);return ids.get(p);};
  const distance=p=>{
    const x=p[0]/scale,z=p[2]/scale;
    const front=clamp((z+.025)/.09,0,1);
    const line=1.625+.073*front*front+.012*Math.exp(-Math.pow((Math.abs(x)-.055)/.02,2));
    return p[1]/scale-line;
  };
  const lift=p=>{
    if(!raised.has(p)){
      const x=p[0],y=p[1]-1.65*scale,z=p[2]+.025*scale,len=Math.hypot(x,y,z)||1;
      const top=clamp((p[1]/scale-1.70)/.05,0,1);
      raised.set(p,[x+.003*scale*x/len,p[1]+(.003*y/len+.007*top)*scale,p[2]+(.003*z/len+.004*top)*scale]);
    }
    return raised.get(p);
  };
  const cut=(a,b,da,db)=>{
    const ai=id(a),bi=id(b),key=ai<bi?ai+':'+bi:bi+':'+ai;
    if(!edges.has(key)){const t=da/(da-db);edges.set(key,a.map((v,k)=>v+(b[k]-v)*t));}
    return edges.get(key);
  };
  const hair=[];
  for(const face of faces){
    if(face.region!==0||face.every(p=>p[1]<1.62*scale))continue;
    const polygon=[];
    for(let i=0;i<3;i++){
      const a=face[i],b=face[(i+1)%3],da=distance(a),db=distance(b);
      if(da>=0)polygon.push(a);
      if((da>=0)!==(db>=0))polygon.push(cut(a,b,da,db));
    }
    for(let i=1;i<polygon.length-1;i++){
      const triangle=[lift(polygon[0]),lift(polygon[i]),lift(polygon[i+1])];
      triangle.region=4;hair.push(triangle);
    }
  }
  // Short, tapered locks lean forward (+Z). Roots overlap the scalp cap;
  // lengths vary deterministically so the silhouette is not a row of cones.
  const anchors=[...raised.values()].filter(p=>p[1]>1.71*scale);
  for(let row=0;row<2;row++)for(let lock=0;lock<7;lock++){
    const x=(lock-3)*.016*scale,z=(row===0?.049:.012)*scale;
    let root=null,best=Infinity;
    for(const p of anchors){const score=(p[0]-x)**2+(p[2]-z)**2;if(score<best){best=score;root=p;}}
    if(!root)continue;
    const length=(.017+.006*Math.cos(lock*1.7+row))*scale;
    const rings=[],sides=8;
    for(let j=0;j<5;j++){
      const t=j/4,r=.011*scale*Math.pow(1-t,.85)+.00015*scale;
      const center=[root[0]+.003*scale*Math.sin(lock)*t,root[1]-.004*scale+length*t,root[2]+.020*scale*t*t];
      rings.push(Array.from({length:sides},(_,k)=>{
        const a=k*2*Math.PI/sides;
        return [center[0]+r*Math.cos(a),center[1]-.45*r*Math.sin(a),center[2]+.75*r*Math.sin(a)];
      }));
    }
    for(let j=0;j<4;j++)for(let k=0;k<sides;k++){
      const n=(k+1)%sides;
      for(const triangle of [[rings[j][k],rings[j+1][k],rings[j][n]],[rings[j][n],rings[j+1][k],rings[j+1][n]]]){
        triangle.region=4;hair.push(triangle);
      }
    }
  }
  faces.push(...hair);
}

// Triangles share point objects, so averaging by object identity produces
// smooth normals without coordinate hashing on every measurement update.
function buffers(faces) {
  const normals=new Map();
  for(const f of faces){
    const a=f[1].map((v,i)=>v-f[0][i]),b=f[2].map((v,i)=>v-f[0][i]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    for(const p of f){let sum=normals.get(p);if(!sum){sum=[0,0,0];normals.set(p,sum);}for(let i=0;i<3;i++)sum[i]+=n[i];}
  }
  const data=new Float32Array(faces.length*21);let i=0;
  for(const f of faces)for(const p of f){const n=normals.get(p),len=Math.hypot(...n)||1;for(let j=0;j<3;j++){data[i+j]=p[j];data[i+j+3]=n[j]/len;}data[i+6]=f.region||0;i+=7;}
  return data;
}
module.exports={create,dimensions,circumference,buffers,source};
