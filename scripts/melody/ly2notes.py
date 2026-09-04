# LilyPond の単旋律（サブセット）→ [{"m":midi,"n":16分音符の数}]
import re, sys, json
STEP={"c":0,"d":2,"e":4,"f":5,"g":7,"a":9,"b":11}; LET="cdefgab"
def strip(src):
    src=re.sub(r"%.*","",src)
    src=re.sub(r"\\markup\s*\{[^{}]*(\{[^{}]*\}[^{}]*)*\}","",src)
    src=re.sub(r"\\(set|override|once\s*\\override)\s+[\w.]+\s*=\s*#?(\"[^\"]*\"|\S+)","",src)
    src=re.sub(r"\\tempo\s+(\"[^\"]*\")?\s*(\d+\s*=\s*\d+)?","",src)
    src=re.sub(r"\\(clef|key)\s+\S+(\s+\\(major|minor))?","",src)
    src=re.sub(r"\\time\s+\d+/\d+","",src); src=re.sub(r"\\partial\s+\d+\.?","",src); src=re.sub(r"\\bar\s+\"[^\"]*\"","",src)
    src=re.sub(r"\\(pp|p|mp|mf|f|ff|fermata|sustainOn|sustainOff|noBreak|stemNeutral|stemUp|stemDown|voiceOne|voiceTwo|dynamicUp|crossStaff|trill|unfoldRepeats)\b","",src)
    src=re.sub(r"\\tuplet\s+\d+/\d+","",src); src=re.sub(r"\\addlyrics\s*\{[^}]*\}","",src)
    src=re.sub(r"\^\"[^\"]*\"","",src); src=re.sub(r"[-_^][.>_^!+]","",src); src=re.sub(r"\\[<>!]","",src)
    return src
def expand_repeats(src):
    while True:
        m=re.search(r"\\repeat\s+unfold\s+(\d+)\s*\{",src)
        if not m: return src
        i=m.end(); depth=1
        while depth: depth+= 1 if src[i]=="{" else -1 if src[i]=="}" else 0; i+=1
        body=src[m.end():i-1]; src=src[:m.start()]+(" "+body+" ")*int(m.group(1))+src[i:]
def cells(dur,dots):
    n=16/dur
    if dots: n=n*(2-0.5**len(dots))
    return max(1,int(round(n)))
NOTE=r"([a-g])((?:is|es|s)*)([',]*)"
def acc_of(a): return a.count("is")-a.count("es")-(1 if a=="s" else 0)
class Ctx:
    def __init__(s, relative):
        s.prev=None
        if relative:
            m=re.match(NOTE,relative); s.prev=(3+m.group(3).count("'")-m.group(3).count(","))*7+LET.index(m.group(1))
        s.rel=relative is not None
    def pitch(s,name):
        m=re.match(NOTE,name); l=LET.index(m.group(1)); acc=acc_of(m.group(2)); up=m.group(3).count("'")-m.group(3).count(",")
        if not s.rel: return 48+STEP[m.group(1)]+acc+12*up
        base=s.prev; cand=[o*7+l for o in range(0,9)]; la=min(cand,key=lambda v:(abs(v-base),-v))
        la+=7*up; s.prev=la
        return 12*(la//7+1)+STEP[LET[la%7]]+acc
def parse(src):
    src=expand_repeats(strip(src)); relative=None
    m=re.search(r"\\relative\s+([a-g](?:is|es|s)*[',]*)\s*\{",src)
    if m: relative=m.group(1); src=src[m.end():]
    c=Ctx(relative); toks=re.findall(r"<[^>]*>[\d.]*|[a-gRr](?:is|es|s)*[',]*\d*\.*|\\\w+|\S",src)
    notes=[]; dur=4
    for t in toks:
        if t.startswith("\\") or t in "{}|~()[]": continue
        if t.startswith("<"):
            inner=re.findall(r"[a-g](?:is|es|s)*[',]*",t[1:t.index(">")]); d=re.search(r">(\d+)(\.*)",t); dots=""
            if d: dur=int(d.group(1)); dots=d.group(2)
            ps=[c.pitch(n) for n in inner]
            if c.rel: c.prev=c.prev  # 和音の後は最初の音基準（簡略）
            notes.append({"m":max(ps),"n":cells(dur,dots)}); continue
        m=re.match(r"([a-gRr](?:is|es|s)*[',]*)(\d*)(\.*)$",t)
        if not m: continue
        name,d,dots=m.groups()
        if d: dur=int(d)
        if name[0] in "rR": notes.append({"m":-1,"n":cells(dur,dots)}); continue
        notes.append({"m":c.pitch(name),"n":cells(dur,dots)})
    return notes
NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
nn=lambda m: NAMES[m%12]+str(m//12-1)
if __name__=="__main__":
    src=open(sys.argv[1],encoding="utf-8").read()
    if len(sys.argv)>2 and sys.argv[2]: src=src[src.index(sys.argv[2]):]
    if len(sys.argv)>3 and sys.argv[3]: src=src[:src.index(sys.argv[3])]
    mel=[n for n in parse(src) if n["m"]>0]
    print(len(mel),"notes:", " ".join(f"{nn(n['m'])}:{n['n']}" for n in mel))
    json.dump(mel, open(sys.argv[4] if len(sys.argv)>4 else sys.argv[1]+".json","w"))
