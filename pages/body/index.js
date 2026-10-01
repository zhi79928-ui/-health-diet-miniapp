const body = require('../../utils/body-shape');
const tracker = require('../../utils/tracker');
const waist = require('../../utils/waist');
function label(at) { const d=new Date(at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
Page({
  data: {height:'',weight:'',waist:'',rows:[],message:'',renderError:'',generated:false,example:true,activeLabel:'示例体型 · 175 cm / 70 kg',note:'未填写腰围时，躯干也采用默认比例。'},
  onLoad() {
    this.yaw=-.25;this.pitch=0;this.zoom=1;
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
  onResize() {this.setupCanvas();},
  setupCanvas() {
    wx.createSelectorQuery().in(this).select('#bodyCanvas').fields({node:true,size:true}).exec(res=>{
      if(this.closed)return;
      try {
        if(!res[0] || !res[0].node)throw new Error('当前设备无法显示模型，请更新微信后重试');
        const {node,width,height}=res[0],info=wx.getWindowInfo?wx.getWindowInfo():wx.getSystemInfoSync();
        const ratio=Math.min(info.pixelRatio || 1,2);
        node.width=width*ratio;node.height=height*ratio;
        this.canvas=node;this.ctx=node.getContext('2d');this.ctx.scale(ratio,ratio);this.size={width,height};
        this.setData({renderError:''});this.paint();
      }catch(e){this.setData({renderError:e.message || '模型显示失败，请重新进入页面'});}
    });
  },
  paint() {if(this.ctx && this.size)body.draw(this.ctx,this.faces,this.yaw,this.pitch,this.zoom,this.size.width,this.size.height);},
  schedule() {if(this.frame || !this.canvas)return;this.frame=this.canvas.requestAnimationFrame(()=>{this.frame=null;if(!this.closed)this.paint();});},
  onUnload() {this.closed=true;if(this.frame && this.canvas)this.canvas.cancelAnimationFrame(this.frame);this.ctx=null;this.faces=null;},
  input(e) {const key=e.currentTarget.dataset.field;if(['height','weight','waist'].includes(key))this.setData({[key]:e.detail.value,message:'输入已修改，点击“更新体型”应用。'});},
  updateModel() {
    try {
      const m=body.measurements(this.data);this.faces=body.mesh(m);this.applied=m;
      this.setData({example:false,generated:true,message:'',activeLabel:`${m.height} cm / ${m.weight} kg${m.waist===null?'':` / 腰围 ${m.waist} cm`}`,note:m.waist===null?'未填写腰围：躯干和四肢均采用默认比例。':'腰围用于调整躯干；肩宽、臀围及四肢采用默认比例。'});this.paint();return true;
    }catch(e){this.setData({message:e.message});return false;}
  },
  touchStart(e) {this.touch=e.touches.map(p=>({x:p.x,y:p.y}));},
  touchMove(e) {
    const t=e.touches,old=this.touch;if(!old || !t.length)return;
    if(t.length===2 && old.length===2){const dist=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const d=dist(old);if(d>0)this.zoom=body.clamp(this.zoom*dist(t)/d,.65,1.5);}
    else if(t.length===1 && old.length===1){this.yaw+=(t[0].x-old[0].x)*.012;this.pitch=body.clamp(this.pitch+(t[0].y-old[0].y)*.005,-.25,.25);}
    this.touchStart(e);this.schedule();
  },
  touchEnd(e) {this.touchStart(e);},
  view(e) {this.yaw=Number(e.currentTarget.dataset.angle);this.pitch=0;this.zoom=1;this.paint();},
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
