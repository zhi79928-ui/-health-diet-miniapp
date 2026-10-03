// Stylized geometry only: these proportions are not an anthropometric prediction.
const KEY = 'bodyShapeHistoryV1';
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function measurements(input) {
  const height = Number(input.height), weight = Number(input.weight);
  const waist = input.waist === '' || input.waist == null ? null : Number(input.waist);
  if (!Number.isFinite(height) || height < 120 || height > 220) throw new Error('请输入 120～220 cm 的身高');
  if (!Number.isFinite(weight) || weight < 30 || weight > 250) throw new Error('请输入 30～250 kg 的体重');
  if (waist !== null && (!Number.isFinite(waist) || waist < 40 || waist > 200)) throw new Error('腰围可留空，或填写 40～200 cm');
  return { height, weight, waist };
}
function read() {
  const rows = wx.getStorageSync(KEY);
  if (!rows) return [];
  if (!Array.isArray(rows) || rows.length > 30) throw new Error('体型记录无法读取，请保留本机数据');
  rows.forEach(row => { if (!row || !Number.isFinite(row.at)) throw new Error('体型记录无法读取'); measurements(row); });
  return rows;
}
function save(input, at = Date.now()) {
  const row = { ...measurements(input), at };
  const rows = [row, ...read()].slice(0, 30);
  wx.setStorageSync(KEY, rows);
  return rows;
}
function mesh(input) {
  const sex = input && input.sex === 'female' ? 'female' : 'male';
  return require('./body-geometry').create({ ...measurements(input), sex });
}
function project(faces, yaw, pitch, zoom, width, height) {
  const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  const scale=height*.4*zoom;
  return faces.map(face => {
    const p=face.map(([x,y,z])=>{ y-=.95; const xx=x*cy+z*sy, zz=-x*sy+z*cy; return [xx,y*cp-zz*sp,y*sp+zz*cp]; });
    const a=p[1].map((v,i)=>v-p[0][i]),b=p[2].map((v,i)=>v-p[0][i]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const len=Math.hypot(...n)||1;
    const light=.55+.4*Math.abs((n[0]*-.4+n[1]*.6+n[2]*.7)/len);
    return { depth:p.reduce((sum,v)=>sum+v[2],0)/3, light, points:p.map(v=>[width/2+v[0]*scale,height*.52-v[1]*scale]) };
  }).sort((a,b)=>a.depth-b.depth);
}
function draw(ctx, faces, yaw, pitch, zoom, width, height) {
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#f0f5ef'; ctx.fillRect(0,0,width,height);
  const projected=project(faces,yaw,pitch,zoom,width,height);
  const floor=Math.max(...projected.map(f=>Math.max(...f.points.map(p=>p[1]))));
  ctx.fillStyle='rgba(35,77,57,.10)'; ctx.beginPath(); ctx.ellipse(width/2,floor,width*.20*zoom,height*.018,0,0,Math.PI*2);ctx.fill();
  projected.forEach(f=>{
    ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();
    ctx.fillStyle=`rgb(${Math.round(112*f.light)},${Math.round(164*f.light)},${Math.round(143*f.light)})`;ctx.fill();
  });
}
module.exports={measurements,read,save,mesh,project,draw,clamp};
