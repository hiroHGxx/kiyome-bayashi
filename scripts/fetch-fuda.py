#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""台帳（scripts/data/fuda-ledger.json＝公式MCP kitan-lore list_assets(kind=fuda) の写し・290枚）から札絵を取る。
**URLは組み立てない**（径路が /fuda/ /fuda/app/ /fuda/v2/ /fuda/v3/ で混在し、名前に _v2 _v3 の変種がある）。
台帳の bytes と実サイズを突き合わせるので、径路違い・途中切れはここで露見する。

  python3 scripts/fetch-fuda.py --chars anne,oto,nemu --ranks 10        # 3柱の段10
  python3 scripts/fetch-fuda.py --ranks 1-10                             # 全柱・全段（290枚・46.6MB）
  python3 scripts/fetch-fuda.py --list                                   # 柱の一覧（spirits-table.json）

置き場: assets/fuda/<char>_<段2桁>.webp（原寸 1024×1536・.gitignore の外）。配信に載せるなら縮小版を src/assets/ に作る。
顔アイコン（透過1024²）は台帳ではなく https://vibe.co.jp/luna-occulta/media/img/canon/<id>_icon.webp。
"""
import argparse, json, os, sys, time, urllib.request, urllib.error
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(ROOT, "scripts", "data", "fuda-ledger.json"); SPIRITS = os.path.join(ROOT, "scripts", "data", "spirits-table.json")
OUT = os.path.join(ROOT, "assets", "fuda")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60) as r: return r.read()
        except (urllib.error.URLError, OSError) as e: last = e; time.sleep(1.5 * (i + 1))
    raise last
def ranks_of(s):
    out = set()
    for part in s.split(","):
        if "-" in part: a, b = part.split("-"); out.update(range(int(a), int(b) + 1))
        else: out.add(int(part))
    return out
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--chars", default=""); ap.add_argument("--ranks", default="10"); ap.add_argument("--list", action="store_true"); ap.add_argument("--force", action="store_true"); a = ap.parse_args()
    doc = json.load(open(LEDGER, encoding="utf-8")); sp = json.load(open(SPIRITS, encoding="utf-8"))
    if a.list:
        for s in sp["spirits"]: print("%-10s %-6s %s・%s" % (s["id"], s["name"], s["sato"], s["gogyo"]))
        print("（札絵が無い柱: 栞・あるじどの・サスラ・トバリ・ゴコウ）"); return 0
    chars = set(a.chars.split(",")) if a.chars else set(doc["chars"]); ranks = ranks_of(a.ranks)
    want = [x for x in doc["assets"] if x["char"] in chars and x["rank"] in ranks]
    if not want: print("台帳に該当なし（--list で柱の id を確認）"); return 1
    os.makedirs(OUT, exist_ok=True); got = skip = 0; bad = []
    for x in want:
        dst = os.path.join(OUT, "%s_%02d.webp" % (x["char"], x["rank"]))
        if not a.force and os.path.exists(dst) and os.path.getsize(dst) == x["bytes"]: skip += 1; continue
        try: body = fetch(x["url"])
        except Exception as e: bad.append((x["id"], str(e))); continue
        if len(body) != x["bytes"]: bad.append((x["id"], "サイズ違い 台帳%d 実物%d" % (x["bytes"], len(body)))); continue
        open(dst, "wb").write(body); got += 1
    print("取得 %d / 据え置き %d / 失敗 %d → %s" % (got, skip, len(bad), OUT))
    for b in bad: print("  !!", *b)
    return 1 if bad else 0
if __name__ == "__main__": sys.exit(main())
