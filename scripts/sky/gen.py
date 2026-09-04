# Lovart で浄めばやしの空（月・背景6・額装）を順に生成する。出力は lovart/<key>/ に落ちる。スキルのコマンドだけを使う
import subprocess, json, os, sys, pathlib, time
SK=os.path.expanduser("~/.claude/skills/lovart-skill/scripts/agent_skill.py"); OUT=pathlib.Path(sys.argv[1]); LOG=open(OUT/"gen.log","a")
def log(*a): print(*a, file=LOG, flush=True); print(*a, flush=True)
COMMON="『月蝕綺譚』風の和風ダークファンタジー。配色は宵闇の藍（#131320〜#1B1B2E）を地に、金（#D9A94C・#F0CE7E）を差す「宵闇に金」。文字なし・キャラクターなし・ロゴなし。1枚だけ生成し、レイアウト展開や複数案は不要。"
JOBS=[
 ("moon", "満月の一枚絵。正方形（1:1）。完全な黒（#000000）の地に、中央に大きく満月。月は金色を帯びた月光色（#F0CE7E）で、月面の海の模様はやわらかく、縁にごく薄い暈。月以外は真っ黒（合成で黒を透明にするため、雲や星は描かない）。"+COMMON),
 ("bg_kojo", "ゲームの盤の背景（縦2:3）。『荒城の月』の情景。宵闇の藍の夜空の下、丘の上に荒れた城跡（石垣と崩れた天守の影）が画面の下1/3にシルエットで。月は描かない（別の層で重ねる）。上2/3は淡い星と薄い霞だけで暗く、中央は低コントラストに（上に札が並ぶため）。金の雲の縁取りを上辺にほんの少し。"+COMMON),
 ("bg_oboro", "ゲームの盤の背景（縦2:3）。『朧月夜』の情景。春の夜、菜の花畑が画面の下1/3に広がり、全体に朧（もや）がやわらかくかかる。月は描かない（別の層で重ねる）。上部は霞んだ紺の空で暗く、中央は低コントラストに（上に札が並ぶため）。菜の花は暗い金色で控えめ。"+COMMON),
 ("bg_sakura", "ゲームの盤の背景（縦2:3）。『さくらさくら』の情景。夜桜の枝が画面の上辺と左右から差し込み、花は暗紫（#8E6B9E）〜淡い月光色で控えめに。中央は空けて暗く低コントラストに（上に札が並ぶため）。月は描かない（別の層で重ねる）。"+COMMON),
 ("bg_gekko", "ゲームの盤の背景（縦2:3）。『月光』の情景。静かな夜の湖面が画面の下1/3にあり、水面に月の光の道（反射）が縦に伸びる。月そのものは描かない（別の層で重ねる）。上は静かな夜空、中央は低コントラストに（上に札が並ぶため）。"+COMMON),
 ("bg_hamabe", "ゲームの盤の背景（縦2:3）。『浜辺の歌』の情景。夜明け前の浜辺。画面の下1/3に静かな波打ち際、水平線にごくわずかな薄明（朱#E0562F→金#F0CE7E→藍へ、面積は小さく）。上は薄れゆく星空で暗く、中央は低コントラストに（上に札が並ぶため）。月は描かない。"+COMMON),
 ("frame", "ゲームの盤の額装（縦2:3）。完全な黒（#000000）の地に、金の蒔絵の額縁だけを描く。上辺に金の雲と小さな桜の紋、左右は細い流水文と金砂、下辺に金砂の溜まり。中央の広い部分は真っ黒のまま（合成で黒を透明にするため、中には何も描かない）。金は #D9A94C と #F0CE7E。"+COMMON),
]
thread=None
for key,prompt in JOBS:
    d=OUT/key; d.mkdir(exist_ok=True)
    cmd=["python3",SK,"chat","--prompt",prompt,"--json","--download","--output-dir",str(d),"--prefer-models",'{"IMAGE":["generate_image_gpt_image_2"]}']
    if thread: cmd+=["--thread-id",thread]
    log(f"=== {key} start {time.strftime('%H:%M:%S')}")
    for attempt in range(2):
        r=subprocess.run(cmd,capture_output=True,text=True)
        try:
            j=json.loads(r.stdout[r.stdout.index("{"):]) if "{" in r.stdout else {}
        except Exception as e:
            j={}; log("  json parse failed:", str(e)[:80], r.stdout[-300:], r.stderr[-300:])
        st=j.get("final_status"); files=[x.get("local_path") for x in j.get("downloaded",[]) or []]
        if not thread and j.get("thread_id"): thread=j["thread_id"]; log("  thread:",thread)
        log(f"  status={st} ok={j.get('generation_succeeded')} files={files} warn={j.get('warning')} msg={(j.get('agent_message') or '')[:120]}")
        if files or st in ("pending_confirmation","abort"): break
        if r.returncode!=0: log("  stderr:", r.stderr[-400:]); time.sleep(20)
    log(f"=== {key} end {time.strftime('%H:%M:%S')}")
log("ALL DONE")
