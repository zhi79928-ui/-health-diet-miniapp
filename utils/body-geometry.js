// Procedural adult mannequin. Heights are metres, measured waist is an ellipse
// circumference. Other proportions are illustrative, not a body reconstruction.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function circumference(a,b) {
  const h=((a-b)/(a+b))**2;
  return Math.PI*(a+b)*(1+3*h/(10+Math.sqrt(4-3*h)));
}
function dimensions(m) {
  const height=m.height/100, scale=height/1.75;
  const fullness=clamp(Math.sqrt(m.weight/(height*height)/23),.72,1.65);
  const waist=(m.waist===null?78*scale*fullness:m.waist)/100;
  const waistX=waist/circumference(1,.76);
  return {height,scale,fullness,waistX,waistZ:waistX*.76};
}
function create(m) {
  const d=dimensions(m),{height:H,scale:S,fullness:F,waistX:W,waistZ:D}=d;
  const faces=[], N=64;
  // Ring layout: y, x-radius, z-radius, x-centre, z-centre.
  function surface(source, subdivisions=4, deform) {
    const rows=source.map(r=>[r[0],r[1],r[2],r[3]||0,r[4]||0]), smooth=[];
    for(let i=0;i<rows.length-1;i++)for(let j=0;j<subdivisions;j++) {
      const t=j/subdivisions,p0=rows[Math.max(0,i-1)],p1=rows[i],p2=rows[i+1],p3=rows[Math.min(rows.length-1,i+2)];
      smooth.push(p1.map((v,k)=>{
        // Linear y interpolation prevents a surface folding at the ends.
        if(k===0)return v+(p2[k]-v)*t;
        const r=.5*(2*v+(-p0[k]+p2[k])*t+(2*p0[k]-5*v+4*p2[k]-p3[k])*t*t+(-p0[k]+3*v-3*p2[k]+p3[k])*t*t*t);
        return k===1||k===2?Math.max(.00001,r):r;
      }));
    }
    smooth.push(rows[rows.length-1]);
    const points=smooth.map(r=>Array.from({length:N},(_,i)=>{
      const a=i*2*Math.PI/N;
      const p=[r[3]+r[1]*Math.cos(a),r[0],r[4]+r[2]*Math.sin(a)];
      return deform?deform(p,a):p;
    }));
    for(let i=0;i<points.length-1;i++)for(let j=0;j<N;j++) {
      const k=(j+1)%N;
      // Outward winding: rings descend from head toward feet.
      faces.push([points[i][j],points[i][k],points[i+1][j]],[points[i][k],points[i+1][k],points[i+1][j]]);
    }
  }
  const shoulder=.205*S*Math.pow(F,.35), chest=Math.max(.16*S*F,W*.93);
  const hip=Math.max(.164*S*F,W*.94), belly=Math.max(.108*S*F,D*.98);
  // Continuous neck, trapezius, ribcage, waist and pelvis. Waist ring is exact.
  surface([[H*.895,.052*S,.050*S],[H*.867,.054*S,.052*S],
    [H*.843,.083*S,.064*S],[H*.826,.146*S,.075*S],
    [H*.805,shoulder,.086*S*F],[H*.77,chest,.112*S*F,0,.005*S],
    [H*.72,Math.max(W*.99,chest*.91),Math.max(D*.98,.106*S*F),0,.002*S],
    [H*.64,W,D],[H*.60,Math.max(W*.99,hip*.94),belly,0,.008*S],
    [H*.56,hip,.119*S*F,0,-.002*S],[H*.525,hip*.91,.110*S*F,0,-.01*S],
    [H*.49,hip*.54,.057*S*F,0,-.005*S],[H*.485,.00001,.00001]],5,
    (p,a)=>{
      // Subtle sternum / back groove; do not alter the measured waist section.
      const chestBand=Math.exp(-Math.pow((p[1]/H-.765)/.032,2));
      if(Math.sin(a)>0) p[2]+=.006*S*chestBand*(1-Math.exp(-Math.pow(p[0]/(.03*S),2)));
      return p;
    });
  // Adult cranial proportions, cheekbones, jaw and chin, rather than an oval ball.
  surface([[H,.00001,.00001],[H*.997,.034*S,.034*S,0,-.008*S],
    [H*.986,.066*S,.066*S,0,-.008*S],[H*.965,.078*S,.082*S,0,-.008*S],
    [H*.944,.073*S,.085*S,0,-.001*S],[H*.928,.068*S,.079*S,0,.004*S],
    [H*.911,.054*S,.065*S,0,.014*S],[H*.897,.034*S,.046*S,0,.022*S],
    [H*.895,.00001,.00001,0,.019*S]].map(r=>[H-(H-r[0])*1.19,...r.slice(1)]),5,(p,a)=>{
      if(Math.sin(a)>0){
        const x=p[0]/S,y=1-(1-p[1]/H)/1.19;
        // Integrated nose bridge, shallow eye sockets and lip/chin planes.
        const nose=.027*S*Math.exp(-Math.pow(x/.016,2)-Math.pow((y-.934)/.012,2));
        const eyes=.009*S*(Math.exp(-Math.pow((x-.031)/.018,2))+Math.exp(-Math.pow((x+.031)/.018,2)))*Math.exp(-Math.pow((y-.946)/.005,2));
        p[2]+=nose-eyes+.003*S*Math.exp(-Math.pow(x/.028,2)-Math.pow((y-.916)/.003,2));
      }return p;
    });
  function ellipsoid(cx,cy,cz,rx,ry,rz) {
    const rows=[];for(let i=0;i<=20;i++){const a=i*Math.PI/20;rows.push([cy+ry*Math.cos(a),Math.max(.00001,rx*Math.sin(a)),Math.max(.00001,rz*Math.sin(a)),cx,cz]);}surface(rows,1);
  }
  [-1,1].forEach(s=>{
    ellipsoid(s*.074*S,H*(1-(1-.934)*1.19),-.005*S,.013*S,.027*S,.020*S);
    const arm=shoulder*.94, armF=Math.pow(F,.7), spread=Math.max(0,W-.16*S)*.6;
    // Deltoid flows into upper arm, elbow, forearm and wrist as one surface.
    surface([[H*.814,.001,.001,s*arm],
      [H*.804,.049*S*armF,.058*S*armF,s*(arm+.012*S)],
      [H*.777,.061*S*armF,.064*S*armF,s*(arm+.027*S)],
      [H*.736,.052*S*armF,.057*S*armF,s*(arm+.050*S+spread*.25)],
      [H*.674,.038*S*armF,.041*S*armF,s*(arm+.072*S+spread*.55)],
      [H*.646,.036*S,.037*S,s*(arm+.079*S+spread*.6)],
      [H*.615,.043*S*armF,.043*S*armF,s*(arm+.088*S+spread*.7)],
      [H*.567,.034*S*armF,.035*S*armF,s*(arm+.100*S+spread*.85)],
      [H*.526,.025*S,.026*S,s*(arm+.108*S+spread)],
      [H*.513,.024*S,.023*S,s*(arm+.110*S+spread)]],5);
    const handX=s*(arm+.112*S+spread);
    surface([[H*.522,.023*S,.021*S,handX],[H*.505,.036*S,.022*S,handX],
      [H*.480,.037*S,.019*S,handX],[H*.448,.026*S,.012*S,handX+s*.006*S],
      [H*.443,.005*S,.003*S,handX+s*.009*S]],5);
    ellipsoid(handX-s*.035*S,H*.487,.011*S,.014*S,.035*S,.016*S);
    const legX=.083*S*Math.pow(F,.4), thigh=.087*S*Math.pow(F,.75);
    surface([[H*.554,.045*S,.05*S,s*legX,-.006*S],
      [H*.527,thigh,.105*S*Math.pow(F,.7),s*legX,-.008*S],
      [H*.471,thigh*.94,.096*S*Math.pow(F,.7),s*(legX+.004*S)],
      [H*.407,thigh*.77,.077*S*Math.pow(F,.6),s*(legX+.008*S),.003*S],
      [H*.328,.049*S,.050*S,s*(legX+.008*S),.011*S],
      [H*.296,.045*S,.049*S,s*(legX+.007*S),.013*S],
      [H*.257,.059*S*Math.pow(F,.5),.062*S*Math.pow(F,.5),s*(legX+.011*S),-.007*S],
      [H*.210,.058*S*Math.pow(F,.5),.061*S*Math.pow(F,.5),s*(legX+.014*S),-.014*S],
      [H*.127,.037*S,.041*S,s*(legX+.014*S),-.003*S],
      [H*.065,.026*S,.031*S,s*(legX+.013*S)],
      [H*.030,.027*S,.033*S,s*(legX+.013*S)]],5);
    // Low arched foot, toes forward, flat sole fixed at y=0.
    surface([[H*.067,.022*S,.036*S,s*(legX+.013*S),.008*S],
      [H*.045,.038*S,.070*S,s*(legX+.013*S),.030*S],
      [H*.025,.044*S,.114*S,s*(legX+.015*S),.057*S],
      [H*.009,.044*S,.117*S,s*(legX+.015*S),.059*S],
      [0,.036*S,.108*S,s*(legX+.015*S),.057*S],
      [0,.00001,.00001,s*(legX+.015*S),.057*S]],4);
  });
  faces.dimensions=d;
  return faces;
}
// Ring triangles share vertex objects, including the wrap seam. Average their
// normals once without expensive coordinate-string allocations on each update.
function buffers(faces) {
  const normals=new Map();
  for(const f of faces){
    const a=f[1].map((v,i)=>v-f[0][i]),b=f[2].map((v,i)=>v-f[0][i]);
    const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    for(const p of f){let sum=normals.get(p);if(!sum){sum=[0,0,0];normals.set(p,sum);}for(let i=0;i<3;i++)sum[i]+=n[i];}
  }
  const data=new Float32Array(faces.length*18);let i=0;
  for(const f of faces)for(const p of f){const n=normals.get(p),len=Math.hypot(...n)||1;for(let j=0;j<3;j++){data[i+j]=p[j];data[i+j+3]=n[j]/len;}i+=6;}
  return data;
}
module.exports={create,dimensions,circumference,buffers};
