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
  // The neutral MakeHuman mesh uses a horizontal rest pose. Lower the arms
  // into a relaxed standing pose, with a soft shoulder blend.
  for(const p of points) {
    const side=Math.sign(p[0]),ax=Math.abs(p[0]);
    if(side && p[1]>.72 && p[1]<1.56 && ax>.155) {
      const blend=smooth(.155,.255,ax)*smooth(.72,.92,p[1]);
      const angle=-side*1.28*blend,pivotX=side*.17,pivotY=1.43;
      const x=p[0]-pivotX,y=p[1]-pivotY,c=Math.cos(angle),s=Math.sin(angle);
      p[0]=pivotX+x*c-y*s;p[1]=pivotY+x*s+y*c;
    }
  }
  const waistBand=points.filter(p=>p[1]>1.09&&p[1]<1.15&&Math.abs(p[0])<.24);
  const waistX=Math.max(...waistBand.map(p=>Math.abs(p[0])));
  const zMin=Math.min(...waistBand.map(p=>p[2])),zMax=Math.max(...waistBand.map(p=>p[2]));
  base={points,indices,regions,waistX,waistZ:(zMax-zMin)/2,waistCenterZ:(zMax+zMin)/2};
  return base;
}

function create(m) {
  const d=dimensions(m),src=source(),female=d.sex==='female',H=d.height,S=d.scale,F=d.fullness;
  const points=src.points.map((original,index)=>{
    let [x,y,z]=original;const yn=y/1.75,eye=index>=13380;
    if(eye)return [x*S,y*S,z*S];
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
    if(Math.abs(original[0])<.30) {
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
    return [x*S,y*S,z*S];
  });
  const faces=[];
  for(let i=0;i<src.indices.length;i+=3) {
    const face=[points[src.indices[i]],points[src.indices[i+1]],points[src.indices[i+2]]];
    const authored=src.regions[i/3];
    if(authored===3)face.region=3;
    else {
      const cy=(face[0][1]+face[1][1]+face[2][1])/(3*H),cx=Math.abs((face[0][0]+face[1][0]+face[2][0])/3);
      face.region=cy<.49?2:((cx<.30*S || cy>.72)&&cy<.82?1:0);
    }
    faces.push(face);
  }
  faces.dimensions=d;faces.source={name:asset.source,license:asset.license};
  return faces;
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
