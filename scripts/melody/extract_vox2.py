import sys, json, numpy as np, librosa
from scipy.signal import medfilt
path=sys.argv[1]; out=sys.argv[2]
y,sr=librosa.load(path,sr=22050,mono=True)
NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
def nn(m): return NAMES[int(m)%12]+str(int(m)//12-1)
hop=256
rms=librosa.feature.rms(y=y,frame_length=2048,hop_length=hop)[0]
db=20*np.log10(rms+1e-9); print("vocal stem rms dB percentiles 50/80/95:", np.percentile(db,[50,80,95]).round(1))
print("--- vocal activity per 5s (mean dB) ---")
t=librosa.frames_to_time(np.arange(len(rms)),sr=sr,hop_length=hop)
row=[]
for a in range(0,240,5):
    m=(t>=a)&(t<a+5); v=db[m].mean() if m.any() else -99; row.append(f"{a}:{v:.0f}")
print(" ".join(row))
f0,vf,vp=librosa.pyin(y,fmin=librosa.note_to_hz("G2"),fmax=librosa.note_to_hz("C6"),sr=sr,frame_length=2048,hop_length=hop)
midi=np.full(len(f0),np.nan); ok=~np.isnan(f0); midi[ok]=librosa.hz_to_midi(f0[ok])
thr=np.percentile(db,60)-6
q=np.where(np.isnan(midi)|(vp<0.25)|(db<thr),-1,np.round(np.nan_to_num(midi,nan=-1))).astype(int)
q=medfilt(q,5)
notes=[]; i=0
while i<len(q):
    j=i
    while j<len(q) and q[j]==q[i]: j+=1
    if q[i]>0 and (j-i)*hop/sr>=0.06: notes.append({"t":round(i*hop/sr,2),"d":round((j-i)*hop/sr,2),"m":int(q[i])})
    i=j
json.dump(notes,open(out,"w"))
print("total notes",len(notes),"thr dB",round(thr,1))
pcs=np.zeros(12)
for n in notes: pcs[n["m"]%12]+=n["d"]
order=np.argsort(-pcs); print("pitch-class weight:", ", ".join(f"{NAMES[k]}:{pcs[k]:.1f}" for k in order[:9]))
phr=[]; cur=None
for n in notes:
    if cur and n["t"]-cur["end"]>0.8: phr.append(cur); cur=None
    if not cur: cur={"start":n["t"],"end":n["t"]+n["d"],"n":0}
    cur["end"]=n["t"]+n["d"]; cur["n"]+=1
if cur: phr.append(cur)
print("--- sung phrases (>=4 notes) ---")
for p in phr:
    if p["n"]>=4: print(f"{p['start']:6.1f}-{p['end']:6.1f}  {p['n']:3d} notes")
