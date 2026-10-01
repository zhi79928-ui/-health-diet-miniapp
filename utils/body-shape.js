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
  const m = measurements(input), faces = [], h = m.height / 175;
  const fullness = clamp(Math.sqrt((m.weight / (m.height / 100) ** 2) / 22), .75, 1.55);
  // Fixed ellipse aspect ratio; measured circumference guides the waist only.
  const waistX = m.waist === null ? .155 * fullness : clamp(m.waist / m.height / 2.7, .10, .34);
  function rings(rows) {
    const n = 24;
    if (rows.length < 10) {
      const base=rows.map(row=>[row[0],row[1],row[2],row[3]||0,row[4]||0]), smooth=[];
      for(let i=0;i<base.length-1;i++) for(let step=0;step<4;step++) {
        const t=step/4,p0=base[Math.max(0,i-1)],p1=base[i],p2=base[i+1],p3=base[Math.min(base.length-1,i+2)];
        smooth.push(p1.map((v,k)=>{
          const value=.5*((2*v)+(-p0[k]+p2[k])*t+(2*p0[k]-5*v+4*p2[k]-p3[k])*t*t+(-p0[k]+3*v-3*p2[k]+p3[k])*t*t*t);
          return k===1 || k===2 ? Math.max(.001,value) : value;
        }));
      }
      rows=[...smooth,base[base.length-1]];
    }
    const pts = rows.map(([y, x, z, cx = 0, cz = 0]) => Array.from({ length: n }, (_, i) => {
      const a = i * Math.PI * 2 / n;
      return [(cx + x * Math.cos(a)) * h, y * h, (cz + z * Math.sin(a)) * h];
    }));
    for (let r = 0; r < pts.length - 1; r++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      faces.push([pts[r][i], pts[r+1][i], pts[r+1][j]], [pts[r][i], pts[r+1][j], pts[r][j]]);
    }
  }
  function ellipsoid(cx, cy, cz, rx, ry, rz) {
    const rows = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * i / 12;
      rows.push([cy + ry * Math.cos(a), rx * Math.sin(a), rz * Math.sin(a), cx, cz]);
    }
    rings(rows);
  }
  rings([[1.01,.02,.02],[.99,.17*fullness,.12*fullness],[.88,.19*fullness,.135*fullness],
    [.75,waistX,waistX*.72],[.64,.205*fullness,.14*fullness],[.57,.17*fullness,.12*fullness],[.55,.01,.01]]);
  ellipsoid(0,1.035,0,.065,.095,.065);
  ellipsoid(0,1.19,.005,.103,.145,.098);
  // Small nose gives a front/back orientation cue, without a personal face.
  ellipsoid(0,1.18,.098,.021,.033,.025);
  [-1,1].forEach(s => {
    ellipsoid(s*.195*fullness,.96,0,.074*fullness,.10,.078*fullness);
    rings([[.98,.035,.04,s*.215*fullness],[.91,.062*fullness,.065*fullness,s*.245*fullness],
      [.76,.047*fullness,.05*fullness,s*.285*fullness],[.60,.037*fullness,.04*fullness,s*.31*fullness],[.53,.015,.02,s*.32*fullness]]);
    ellipsoid(s*.322*fullness,.51,0,.038,.065,.025);
    rings([[.66,.045,.06,s*.105*fullness],[.56,.098*fullness,.108*fullness,s*.108*fullness],
      [.38,.065*fullness,.067*fullness,s*.11*fullness],[.29,.067*fullness,.068*fullness,s*.112*fullness],
      [.10,.038,.044,s*.114*fullness],[.055,.025,.025,s*.114*fullness]]);
    ellipsoid(s*.114*fullness,.05,.043,.045,.041,.092);
  });
  return faces;
}
function project(faces, yaw, pitch, zoom, width, height) {
  const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  const scale=Math.min(width*.85,height*.61)*zoom;
  return faces.map(face => {
    const p=face.map(([x,y,z])=>{ y-=.68; const xx=x*cy+z*sy, zz=-x*sy+z*cy; return [xx,y*cp-zz*sp,y*sp+zz*cp]; });
    const a=p[1].map((v,i)=>v-p[0][i]),b=p[2].map((v,i)=>v-p[0][i]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const len=Math.hypot(...n)||1;
    const light=.55+.4*Math.abs((n[0]*-.4+n[1]*.6+n[2]*.7)/len);
    return { depth:p.reduce((sum,v)=>sum+v[2],0)/3, light, points:p.map(v=>[width/2+v[0]*scale,height*.49-v[1]*scale]) };
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
