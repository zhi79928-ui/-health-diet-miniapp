"""Render real mesh front/side/back projections for visual regression review."""
import json, subprocess, pathlib, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection

root = pathlib.Path(__file__).resolve().parents[1]
js = "const g=require('./utils/body-geometry');const f=g.create({height:175,weight:70,waist:null,sex:'male'});console.log(JSON.stringify({faces:f,regions:f.map(f=>f.region)}));"
data = json.loads(subprocess.check_output(['node','-e',js],cwd=root))
faces = np.array(data['faces'])
regions = np.array(data['regions'])
fig, axes = plt.subplots(1,3,figsize=(12,8),facecolor='#eeeae1')
for ax, yaw, label in zip(axes,[0,np.pi/2,np.pi],['Front','Side','Back']):
    c,s = np.cos(yaw),np.sin(yaw)
    rotation = np.array([[c,0,s],[0,1,0],[-s,0,c]])
    p = faces @ rotation.T
    n = np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])
    n /= np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
    light=np.array([-.55,.9,1.15]);light/=np.linalg.norm(light)
    shade=.38+.62*np.maximum(n@light,0)
    colors=np.tile([.69,.54,.43],(len(faces),1))
    colors[regions==1]=[.075,.19,.14]
    colors[regions==2]=[.105,.125,.12]
    colors[regions==5]=[.12,.13,.12]
    colors[regions==3]=[.055,.045,.038]
    colors[regions==4]=[.065,.047,.035]
    colors*=shade[:,None]
    order=np.argsort(p[:,:,2].mean(axis=1))
    ax.add_collection(PolyCollection(p[order,:,:2],facecolors=colors[order],edgecolors='none',antialiased=False))
    ax.set(xlim=(-.65,.65),ylim=(-.04,1.83),aspect='equal',title=label)
    ax.set_facecolor('#eeeae1');ax.axis('off')
fig.suptitle('Actual mesh review | 175 cm / 70 kg | relaxed arms + full outfit',fontsize=16)
fig.tight_layout()
fig.savefig(sys.argv[1] if len(sys.argv)>1 else '/tmp/body-three-views.png',dpi=140)
