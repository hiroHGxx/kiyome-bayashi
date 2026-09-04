import json, sys, difflib, numpy as np
from scipy.signal import medfilt
S=sys.argv[1]; d=json.load(open(S+"/crepe_notes.json")); cell=d["cell"]; b0=d["b0"]
SCALE={6,8,10,11,1,3,5}   # F#長調: F# G# A# B C# D# E#(F)
NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
nn=lambda m: NAMES[m%12]+str(m//12-1)
# セル列に戻す
n_cells=max(n["c"]+n["n"] for n in d["notes"])+1
cells=np.full(n_cells,-1)
for n in d["notes"]: cells[n["c"]:n["c"]+n["n"]]=n["m"]
def fold(m):
    if m<0: return m
    while m>76: m-=12      # D#5 より上は倍音とみなして1オクターブ下げる
    while m<56: m+=12      # G#3 より下は上げる
    return m
def snap(m):
    if m<0: return m
    if m%12 in SCALE: return m
    for k in (1,-1,2,-2):
        if (m+k)%12 in SCALE: return m+k
    return m
c2=np.array([snap(fold(int(m))) for m in cells])
# 1セルの飛びを消す（休符は保つ）
c3=c2.copy()
for i in range(1,len(c2)-1):
    if c2[i]>0 and c2[i-1]>0 and c2[i+1]>0 and c2[i]!=c2[i-1] and c2[i]!=c2[i+1] and c2[i-1]==c2[i+1]: c3[i]=c2[i-1]
    if c2[i]<0 and c2[i-1]>0 and c2[i+1]>0: c3[i]=c2[i-1]   # 1セルの隙間は前の音を伸ばす
notes=[]; i=0
while i<len(c3):
    j=i
    while j<len(c3) and c3[j]==c3[i]: j+=1
    if c3[i]>0: notes.append({"t":round(b0+i*cell,2),"m":int(c3[i]),"n":j-i})
    i=j
# 2セル未満の音は隣の長い音へ吸収
out=[]
for n in notes:
    if n["n"]<2 and out and out[-1]["t"]+out[-1]["n"]*cell>=n["t"]-cell/2: out[-1]["n"]+=n["n"]; continue
    out.append(n)
notes=out
def win(a,b): return [n for n in notes if a<=n["t"]<b]
phr={"Aメロ(20-45s)":win(20,45),"Bメロ(45-75s)":win(45,75),"サビ1(123-152s)":win(123,152),"サビ2(178-201s)":win(178,201),"サビ3(205-232s)":win(205,232)}
for k,v in phr.items(): print(f"--- {k}: {len(v)} notes ---"); print(" ".join(f"{nn(n['m'])}:{n['n']}" for n in v))
s=lambda k:[n["m"] for n in phr[k]]
print("sim サビ1/2:",round(difflib.SequenceMatcher(None,s("サビ1(123-152s)"),s("サビ2(178-201s)")).ratio(),2),
      " サビ1/3:",round(difflib.SequenceMatcher(None,s("サビ1(123-152s)"),s("サビ3(205-232s)")).ratio(),2),
      " サビ2/3:",round(difflib.SequenceMatcher(None,s("サビ2(178-201s)"),s("サビ3(205-232s)")).ratio(),2))
json.dump({"cell":cell,"phrases":{k:[{"m":n["m"],"n":n["n"]} for n in v] for k,v in phr.items()}},open(S+"/phrases.json","w"),ensure_ascii=False)
print("saved phrases.json")
