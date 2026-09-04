import sys, json, numpy as np, librosa, torch, torchcrepe, difflib
S=sys.argv[1]
y,sr=librosa.load(S+"/sep/htdemucs/maintheme/vocals.wav",sr=16000,mono=True)
hop=160
audio=torch.tensor(y)[None]
f0,pd=torchcrepe.predict(audio,16000,hop,fmin=100,fmax=1000,model="tiny",return_periodicity=True,batch_size=512,device="cpu")
pd=torchcrepe.filter.median(pd,5); f0=torchcrepe.filter.mean(f0,3)
f0=f0[0].numpy(); pd=pd[0].numpy()
rms=librosa.feature.rms(y=y,frame_length=1024,hop_length=hop,center=True)[0][:len(f0)]
db=20*np.log10(rms+1e-9); thr=np.percentile(db[db>-60],40)-6 if (db>-60).any() else -40
midi=librosa.hz_to_midi(f0)
voiced=(pd>=0.5)&(db>thr)
grid=json.load(open(S+"/grid.json")); bi=grid["beat"]; b0=0.46; cell=bi/4
n_cells=int((len(f0)*hop/16000-b0)/cell)
cells=[]
for k in range(n_cells):
    a=int((b0+k*cell)*16000/hop); b=int((b0+(k+1)*cell)*16000/hop)
    v=voiced[a:b]
    if len(v) and v.mean()>=0.5: cells.append(int(round(np.median(midi[a:b][v]))))
    else: cells.append(-1)
notes=[]; i=0
while i<len(cells):
    j=i
    while j<len(cells) and cells[j]==cells[i]: j+=1
    if cells[i]>0: notes.append({"c":i,"m":cells[i],"n":j-i,"t":round(b0+i*cell,2)})
    i=j
json.dump({"cell":cell,"b0":b0,"notes":notes},open(S+"/crepe_notes.json","w"))
NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
nn=lambda m: NAMES[m%12]+str(m//12-1)
print("notes",len(notes),"cells",n_cells,"thr",round(float(thr),1))
pcs=np.zeros(12)
for n in notes: pcs[n["m"]%12]+=n["n"]
order=np.argsort(-pcs); print("pitch-class weight:", ", ".join(f"{NAMES[k]}:{int(pcs[k])}" for k in order[:9]))
def win(a,b): return [n for n in notes if a<=n["t"]<b]
def show(a,b):
    seg=win(a,b); print(f"--- {a}-{b}s ({len(seg)} notes) ---"); print(" ".join(f"{nn(n['m'])}:{n['n']}" for n in seg))
for a,b in [(20,45),(45,75),(95,123),(123,152),(165,201),(205,232)]: show(a,b)
s1=[n["m"] for n in win(123,152)]; s2=[n["m"] for n in win(178,201)]; s3=[n["m"] for n in win(205,232)]
print("chorus1 vs chorus2 similarity (pitch seq):", round(difflib.SequenceMatcher(None,s1,s2).ratio(),2))
print("chorus1 vs chorus3 similarity:", round(difflib.SequenceMatcher(None,s1,s3).ratio(),2))
print("chorus2 vs chorus3 similarity:", round(difflib.SequenceMatcher(None,s2,s3).ratio(),2))
