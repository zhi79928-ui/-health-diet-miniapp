const body = require('../../utils/body-shape');
const tracker = require('../../utils/tracker');
const waist = require('../../utils/waist');
const renderer = require('../../utils/body-renderer');
function label(at) { const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
Page({
  data: {height:'',weight:'',waist:'',rows:[],message:'',renderError:'',generated:false,example:true,activeLabel:'示例体型 · 175 cm / 70 kg',note:'未填写腰围时，躯干也采用默认比例。',ticks:[{cm:200,top:10},{cm:175,top:20},{cm:150,top:30},{cm:125,top:40},{cm:100,top:50},{cm:75,top:60},{cm:50,top:70},{cm:25,top:80},{cm:0,top:90}],showRuler:true,headTop:20,autoRotate:true},
  onLoad() {
    this.closed=false;this.hidden=false;this.interacting=false;this.yaw=-.35;this.pitch=0;this.zoom=1;
    this.faces=body.mesh({height:175,weight:70,waist:''});
    try {
      const saved=wx.getStorageSync('healthForm'),weights=tracker.readWeights(),waists=waist.read();
      const f=saved && saved.form || {};
      this.setData({height:f.heightCm || '',weight:weights.length?weights[weights.length-1].kg:(f.weight?Number(f.weight)/(saved.weightUnit==='kg'?1:2):''),waist:waists.length?waists[waists.length-1].cm:''});
      this.refreshRows();
      if(this.data.height && this.data.weight) this.updateModel();
    } catch(e) {this.setData({message:e.message || '读取本机数据失败，可手动填写'});}
  },
  onReady() {this.setupCanvas();},
  onShow() {this.hidden=false;this.startAuto();},
  onHide() {this.hidden=true;this.stopAuto();},
  onResize() {this.setupCanvas();},
  setupCanvas() {
    wx.createSelectorQuery().in(this).select('#bodyCanvas').fields({node:true,size:true}).exec(res=>{
      if(this.closed)return;
      try {
        if(!res[0] || !res[0].node)throw new Error('当前设备无法显示模型，请更新微信后重试');
        const {node,width,height}=res[0],info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();
        const ratio=Math.min(info.pixelRatio || 1,2);
        node.width=width*ratio;node.height=height*ratio;
        this.stopAuto();
        if(this.renderer && typeof this.renderer.dispose==='function')this.renderer.dispose();
        this.canvas=node;this.renderer=renderer.create(node);this.renderer.setMesh(this.faces);this.size={width,height};
        this.setData({renderError:''});this.paint();this.startAuto();
      }catch(e){this.setData({renderError:e.message || '模型显示失败，请重新进入页面'});}
    });
  },
  paint() {if(this.renderer && this.size)try{this.renderer.draw(this.yaw,this.pitch,this.zoom,this.size.width,this.size.height);}catch(e){this.setData({renderError:e.message});}},
  schedule() {if(this.paintFrame || !this.canvas)return;this.paintFrame=this.canvas.requestAnimationFrame(()=>{this.paintFrame=null;if(!this.closed)this.paint();});},
  stopAuto() {
    clearTimeout(this.resumeTimer);this.resumeTimer=null;this.lastFrameTime=null;
    if(this.rotationFrame && this.canvas)this.canvas.cancelAnimationFrame(this.rotationFrame);
    this.rotationFrame=null;
  },
  startAuto(delay=0) {
    this.stopAuto();
    if(!this.data.autoRotate || this.closed || this.hidden || this.interacting || !this.canvas)return;
    if(delay>0){this.resumeTimer=setTimeout(()=>{this.resumeTimer=null;this.startAuto();},delay);return;}
    const rotate=timestamp=>{
      this.rotationFrame=null;
      if(!this.data.autoRotate || this.closed || this.hidden || this.interacting || !this.canvas)return;
      const now=Number.isFinite(timestamp)?timestamp:Date.now();
      if(this.lastFrameTime===null)this.lastFrameTime=now;
      else if(now-this.lastFrameTime>=30){const elapsed=Math.min(100,Math.max(0,now-this.lastFrameTime));this.yaw=(this.yaw+elapsed*Math.PI*2/20000)%(Math.PI*2);this.lastFrameTime=now;this.paint();}
      this.rotationFrame=this.canvas.requestAnimationFrame(rotate);
    };
    this.rotationFrame=this.canvas.requestAnimationFrame(rotate);
  },
  toggleAuto() {
    const autoRotate=!this.data.autoRotate;this.setData({autoRotate});
    if(autoRotate)this.startAuto();else this.stopAuto();
  },
  onUnload() {
    this.closed=true;clearTimeout(this.previewTimer);this.stopAuto();
    if(this.paintFrame && this.canvas)this.canvas.cancelAnimationFrame(this.paintFrame);
    this.paintFrame=null;
    if(this.renderer && typeof this.renderer.dispose==='function')this.renderer.dispose();
    this.renderer=null;this.ctx=null;this.faces=null;
  },
  input(e) {
    const key=e.currentTarget.dataset.field;if(!['height','weight','waist'].includes(key))return;
    this.stopAuto();
    this.setData({[key]:e.detail.value,message:'修改中，预览将在输入有效后更新。'});
    clearTimeout(this.previewTimer);this.previewTimer=setTimeout(()=>{if(!this.closed)this.updateModel();},400);
  },
  updateModel() {
    this.stopAuto();
    try {
      clearTimeout(this.previewTimer);
      const m=body.measurements(this.data);this.faces=body.mesh(m);this.applied=m;
      if(this.renderer)this.renderer.setMesh(this.faces);
      this.setData({example:false,generated:true,message:'',headTop:90-m.height*.4,activeLabel:`${m.height} cm / ${m.weight} kg${m.waist===null?'':` / 腰围 ${m.waist} cm`}`,note:m.waist===null?'未填写腰围：躯干和四肢均采用默认比例。':'腰围按测量值调整腰部宽度与厚度；肩、臀和四肢仍是默认比例。'});this.paint();this.startAuto(3000);return true;
    }catch(e){this.setData({message:e.message});this.startAuto(3000);return false;}
  },
  touchStart(e) {this.interacting=true;this.stopAuto();this.touch=e.touches.map(p=>({x:p.x,y:p.y}));},
  touchMove(e) {
    const t=e.touches,old=this.touch;if(!old || !t.length)return;
    if(t.length===2 && old.length===2){const dist=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const d=dist(old);if(d>0)this.zoom=body.clamp(this.zoom*dist(t)/d,.65,1.5);}
    else if(t.length===1 && old.length===1){this.yaw+=(t[0].x-old[0].x)*.012;this.pitch=body.clamp(this.pitch+(t[0].y-old[0].y)*.005,-.25,.25);}
    this.setData({showRuler:Math.abs(this.zoom-1)<.001 && Math.abs(this.pitch)<.001});this.touchStart(e);this.schedule();
  },
  touchEnd(e) {this.touch=e.touches.map(p=>({x:p.x,y:p.y}));if(!e.touches.length){this.interacting=false;this.startAuto(3000);}},
  view(e) {this.stopAuto();this.yaw=Number(e.currentTarget.dataset.angle);this.pitch=0;this.zoom=1;this.setData({showRuler:true});this.paint();this.startAuto(3000);},
  refreshRows() {this.setData({rows:body.read().map((row,index)=>({...row,index,label:label(row.at)}))});},
  save() {
    if(!this.updateModel())return;
    try {body.save(this.applied);this.refreshRows();this.setData({message:'体型快照已保存到本机，未修改体重或腰围记录。'});}
    catch(e){this.setData({message:e.message || '保存失败，请检查本机存储空间'});}
  },
  loadSnapshot(e) {
    const row=this.data.rows[Number(e.currentTarget.dataset.index)];if(!row)return;
    this.setData({height:row.height,weight:row.weight,waist:row.waist===null?'':row.waist});
    if(this.updateModel())this.setData({message:`正在查看 ${row.label} 的快照`});
    wx.pageScrollTo({scrollTop:0,duration:250});
  }
});
