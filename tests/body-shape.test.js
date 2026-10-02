const assert=require('assert');
const b=require('../utils/body-shape');
let storage={};global.wx={getStorageSync:k=>storage[k],setStorageSync:(k,v)=>{storage[k]=v;}};
assert.deepStrictEqual(b.measurements({height:'183',weight:'77',waist:''}),{height:183,weight:77,waist:null});
for(const input of [{height:0,weight:77},{height:183,weight:NaN},{height:183,weight:77,waist:0},{height:250,weight:77}]) assert.throws(()=>b.measurements(input));
const a={height:183,weight:77,waist:82},original=JSON.stringify(a),mesh=b.mesh(a);
assert.equal(JSON.stringify(a),original);
assert.ok(mesh.length>1000);
for(const m of [a,{height:120,weight:30,waist:40},{height:220,weight:250,waist:200}]) {
 for(const angle of [0,Math.PI/2,Math.PI]) {
  const faces=b.project(b.mesh(m),angle,.2,1,350,620);
  assert.ok(faces.every(f=>f.points.flat().every(Number.isFinite)));
  assert.ok(faces.every((f,i)=>!i || f.depth>=faces[i-1].depth));
 }
}
assert.notDeepStrictEqual(b.mesh({...a,waist:100}),mesh);
assert.notDeepStrictEqual(b.mesh({...a,weight:95}),mesh);
for(let i=0;i<35;i++)b.save(a,i);
assert.equal(b.read().length,30);assert.equal(b.read()[0].at,34);
assert.deepStrictEqual(Object.keys(storage),['bodyShapeHistoryV1']);
storage.bodyShapeHistoryV1='broken';assert.throws(()=>b.save(a));assert.equal(storage.bodyShapeHistoryV1,'broken');
// Page integration: prefill units, generate, save and switch a historical snapshot.
storage={healthForm:{form:{heightCm:183,weight:154},weightUnit:'jin'}};
let page;global.Page=p=>{page=p;};require('../pages/body/index');
page.data={...page.data};page.setData=function(x){Object.assign(this.data,x);};
wx.pageScrollTo=()=>{};page.onLoad();assert.equal(page.data.weight,77);assert.equal(page.data.example,false);
page.save();assert.equal(page.data.rows.length,1);
page.input({currentTarget:{dataset:{field:'weight'}},detail:{value:'90'}});page.updateModel();assert.equal(page.applied.weight,90);
page.loadSnapshot({currentTarget:{dataset:{index:0}}});assert.equal(page.applied.weight,77);
page.touchStart({touches:[{x:10,y:10}]});page.touchMove({touches:[{x:60,y:20}]});assert.notEqual(page.yaw,-.25);
page.touchStart({touches:[{x:0,y:0},{x:10,y:0}]});page.touchMove({touches:[{x:0,y:0},{x:1000,y:0}]});assert.equal(page.zoom,1.5);
page.touchEnd({touches:[]});
let nextFrame=0,draws=0,cancelled=[],callbacks=new Map();
page.canvas={requestAnimationFrame(callback){const id=++nextFrame;callbacks.set(id,callback);return id;},cancelAnimationFrame(id){cancelled.push(id);callbacks.delete(id);}};
page.renderer={draw(){draws++;},setMesh(){},dispose(){this.disposed=true;}};page.size={width:350,height:620};page.closed=false;page.hidden=false;page.interacting=false;
page.startAuto();let id=page.rotationFrame;assert.ok(id);
callbacks.get(id)(1000);id=page.rotationFrame;const yawBefore=page.yaw;callbacks.get(id)(1050);
assert.ok(page.yaw>yawBefore);assert.ok(draws>0);assert.ok(page.rotationFrame);
page.touchStart({touches:[{x:1,y:1}]});assert.equal(page.rotationFrame,null);assert.ok(cancelled.length);
page.touchEnd({touches:[]});assert.ok(page.resumeTimer);
page.toggleAuto();assert.equal(page.data.autoRotate,false);assert.equal(page.resumeTimer,null);
page.toggleAuto();assert.equal(page.data.autoRotate,true);assert.ok(page.rotationFrame);
page.onHide();assert.equal(page.rotationFrame,null);
page.onShow();assert.ok(page.rotationFrame);
page.onUnload();assert.equal(page.ctx,null);
// Older WeChat canvas renderers may not expose an explicit dispose hook.
page.renderer={draw(){}};page.canvas=null;page.closed=false;
assert.doesNotThrow(()=>page.onUnload());assert.equal(page.renderer,null);
console.log('body shape tests passed');
const geometry=require('../utils/body-geometry');
const base={height:175,weight:70,waist:78};
function bounds(faces) {
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const f of faces)for(const p of f)for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}
  return {min,max};
}
for(const height of [120,175,195,220]) {
  const shape=geometry.create({...base,height}),box=bounds(shape);
  assert.ok(Math.abs(box.max[1]-height/100)<1e-9,'head matches input height');
  assert.equal(box.min[1],0,'feet stay on ground');
  const projected=b.project(shape,0,0,1,380,590);
  let top=Infinity,bottom=-Infinity;
  for(const f of projected)for(const p of f.points){top=Math.min(top,p[1]);bottom=Math.max(bottom,p[1]);}
  assert.ok(Math.abs(bottom-590*.90)<1e-6,'same screen baseline');
  assert.ok(Math.abs((bottom-top)-height/100*590*.4)<1e-6,'height uses fixed scale');
}
let previousWidth=0,previousDepth=0;
for(const cm of [40,70,78,100,150,200]) {
  const d=geometry.dimensions({...base,waist:cm});
  assert.ok(Math.abs(geometry.circumference(d.waistX,d.waistZ)*100-cm)<1e-9);
  const faces=geometry.create({...base,waist:cm});
  const ring=faces.flat().filter(p=>Math.abs(p[1]-1.75*.64)<1e-9);
  const width=Math.max(...ring.map(p=>p[0]))-Math.min(...ring.map(p=>p[0]));
  const depth=Math.max(...ring.map(p=>p[2]))-Math.min(...ring.map(p=>p[2]));
  assert.ok(Math.abs(width-2*d.waistX)<1e-9 && Math.abs(depth-2*d.waistZ)<1e-9);
  assert.ok(width>previousWidth && depth>previousDepth,'waist grows in front and side views');
  previousWidth=width;previousDepth=depth;
}
const gpu=geometry.buffers(geometry.create(base));
assert.ok(gpu.every(Number.isFinite));
for(let i=0;i<gpu.length;i+=6){const len=Math.hypot(gpu[i+3],gpu[i+4],gpu[i+5]);assert.ok(Math.abs(len-1)<1e-5 || len===0);}
console.log('body proportions, fixed scale, measured waist and smooth normals passed');
