const geometry=require('./body-geometry');
const VERTEX=`
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute float aRegion;
uniform vec2 uAngles;
uniform vec2 uScale;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vBodyY;
varying float vRegion;
vec3 rotate(vec3 p) {
  float c=cos(uAngles.x),s=sin(uAngles.x),cp=cos(uAngles.y),sp=sin(uAngles.y);
  vec3 q=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);
  return vec3(q.x,q.y*cp-q.z*sp,q.y*sp+q.z*cp);
}
void main(){
  vec3 p=rotate(aPosition-vec3(0.0,.95,0.0));
  vPosition=p;vNormal=rotate(aNormal);vBodyY=aPosition.y;vRegion=aRegion;
  gl_Position=vec4(p.x*uScale.x,p.y*uScale.y-.04,-p.z*.3,1.0);
}`;
const FRAGMENT=`
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vBodyY;
varying float vRegion;
uniform float uHeight;
void main(){
  vec3 n=normalize(vNormal);
  vec3 key=normalize(vec3(-.55,.9,1.15));
  vec3 fill=normalize(vec3(.8,.15,.5));
  float diffuse=max(dot(n,key),0.0);
  float bounce=max(dot(n,fill),0.0);
  float rim=pow(1.0-max(dot(n,vec3(0.,0.,1.)),0.),2.5);
  float spec=pow(max(dot(n,normalize(key+vec3(0.,0.,1.))),0.),36.0);
  float y=clamp(vBodyY/uHeight,0.0,1.0);
  vec3 skin=vec3(.69,.54,.43);
  vec3 cloth=vec3(.075,.19,.14);
  vec3 shoe=vec3(.12,.13,.12);
  float torso=step(.5,vRegion)*step(vRegion,1.5);
  float legs=step(1.5,vRegion)*step(vRegion,2.5);
  float eyes=step(2.5,vRegion);
  float topWear=torso*step(.585,y)*(1.0-step(.815,y));
  float shorts=torso*step(.485,y)*(1.0-step(.605,y))+legs*step(.43,y)*(1.0-step(.53,y));
  float shoes=legs*(1.0-step(.055,y));
  vec3 base=mix(skin,cloth,clamp(topWear+shorts,0.0,1.0));
  base=mix(base,shoe,shoes);base=mix(base,vec3(.055,.045,.038),eyes);
  float soft=.31+.62*diffuse+.17*bounce;
  vec3 color=base*soft+mix(vec3(.08,.12,.1),base*.18,.35)*rim+vec3(.13)*spec*(1.0-eyes);
  gl_FragColor=vec4(color,1.0);
}`;
function create(canvas) {
  const gl=canvas.getContext('webgl',{antialias:true,alpha:true,depth:true});
  if(!gl)throw new Error('当前设备无法启用立体渲染，请更新微信后重试');
  const shaders=[],buffers=[];let program;
  function dispose(){buffers.forEach(b=>gl.deleteBuffer(b));if(program)gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));}
  try {
    const compile=(type,source)=>{
      const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('模型光影加载失败，请重新进入页面');return s;
    };
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,FRAGMENT));gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('立体模型加载失败，请重试');
    const buffer=gl.createBuffer();buffers.push(buffer);
    const pos=gl.getAttribLocation(program,'aPosition'),normal=gl.getAttribLocation(program,'aNormal'),region=gl.getAttribLocation(program,'aRegion');
    const angles=gl.getUniformLocation(program,'uAngles'),scale=gl.getUniformLocation(program,'uScale'),heightUniform=gl.getUniformLocation(program,'uHeight');
    let count=0,modelHeight=1.75;
    return {
      setMesh(faces){const data=geometry.buffers(faces);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);count=data.length/7;modelHeight=faces.dimensions&&faces.dimensions.height||1.75;},
      draw(yaw,pitch,zoom,width,height){
        if(gl.isContextLost())throw new Error('立体渲染已中断，请返回后重新进入');
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(normal);gl.vertexAttribPointer(normal,3,gl.FLOAT,false,28,12);gl.enableVertexAttribArray(region);gl.vertexAttribPointer(region,1,gl.FLOAT,false,28,24);
        // 2.5 metres per canvas height, fixed between input changes. Feet stay put.
        const vertical=.8*zoom;gl.uniform2f(scale,vertical*height/width,vertical);gl.uniform2f(angles,yaw,pitch);gl.uniform1f(heightUniform,modelHeight);
        gl.drawArrays(gl.TRIANGLES,0,count);
      },dispose
    };
  }catch(e){dispose();throw e;}
}
module.exports={create,VERTEX,FRAGMENT};
