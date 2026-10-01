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
page.onUnload();assert.equal(page.ctx,null);
console.log('body shape tests passed');
