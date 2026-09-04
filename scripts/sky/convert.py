# Lovart の生成物 → ゲーム用 webp（assets/art/sky/）。背景は 480×720 cover、月は 512² で黒を締める、額装は 480×720 で黒を締める
import sys, pathlib, glob
from PIL import Image, ImageOps
S=pathlib.Path(sys.argv[1]); OUT=pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
ORDER=["moon","bg_kojo","bg_oboro","bg_sakura","bg_gekko","bg_hamabe","frame"]
def latest(key):   # 同じスレッドの download は前の生成物も落とすので、「前の工程に無かったファイル名」を採る
    seen=set()
    for k in ORDER:
        names=set(pathlib.Path(f).name for f in glob.glob(str(S/k/"*.png"))+glob.glob(str(S/k/"*.jpg")))
        new=sorted(names-seen)
        if k==key: return Image.open(S/k/new[-1]).convert("RGB") if new else None
        seen|=names
    return None
def cover(im, w, h):
    return ImageOps.fit(im, (w,h), Image.LANCZOS, centering=(0.5, 0.0))   # 上寄せ
def crush_black(im, lo=28):   # lighter 合成のため、暗部を完全な黒へ寄せる
    lut=[0 if v<=lo else int((v-lo)*255/(255-lo)) for v in range(256)]
    return im.point(lut*3)
report=[]
for key in ["bg_kojo","bg_oboro","bg_sakura","bg_gekko","bg_hamabe"]:
    im=latest(key)
    if im is None: report.append(f"{key}: (no image)"); continue
    out=OUT/f"{key}.webp"; cover(im,480,720).save(out,"WEBP",quality=80,method=6); report.append(f"{key}: {im.size} -> {out.stat().st_size//1024}KB")
# 血月＝御霊おとしの eclipse.jpg（Lovart 生成済み）の上部を流用
ec=Image.open("/Users/USER/Documents/user/kitan-circle/kitan-works/mitama-otoshi/assets/art/eclipse.jpg").convert("RGB").crop((0,0,900,880))
out=OUT/"bg_eclipse.webp"; cover(ec,480,720).save(out,"WEBP",quality=80,method=6); report.append(f"bg_eclipse: reuse mitama-otoshi eclipse.jpg -> {out.stat().st_size//1024}KB")
m=latest("moon")
if m is not None:
    m=crush_black(ImageOps.fit(m,(512,512),Image.LANCZOS)); out=OUT/"moon.webp"; m.save(out,"WEBP",quality=82,method=6); report.append(f"moon: -> {out.stat().st_size//1024}KB")
f=latest("frame")
if f is not None:
    f=crush_black(cover(f,480,720),lo=36); out=OUT/"frame.webp"; f.save(out,"WEBP",quality=80,method=6); report.append(f"frame: -> {out.stat().st_size//1024}KB")
print("\n".join(report)); print("total", sum(p.stat().st_size for p in OUT.glob('*.webp'))//1024, "KB")
