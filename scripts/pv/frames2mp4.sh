#!/bin/bash
# capture-pv.js が録った窓の連番コマ（<窓>/f####.jpg ＋ 可変尺の list.txt）を、
# assemble.sh / make-preview.sh / make-teaser.sh が読む <窓>.mp4（720×1280・30fps）にする。
#   bash scripts/pv/frames2mp4.sh <素材フォルダ>
#
# **この一手が台本に無く、2026-09-08 の撮り直しで assemble.sh が入力なしで止まった**
# （前回は手作業で通していた＝会話の作業場と一緒に消えていた）。
# CDP の screencast はコマの間隔が揃わないので list.txt は可変尺。`fps=30` で定尺へ均す
# （`-r 30` の入力側指定では list.txt の duration が無視されて尺がずれる）。
set -e
SRC="${1:?素材フォルダを渡す}"
for w in w1-opening w2-switch w3-eclipse; do
  [ -f "$SRC/$w/list.txt" ] || { echo "[frames2mp4] $SRC/$w/list.txt が無い"; exit 1; }
  ffmpeg -y -v error -f concat -safe 0 -i "$SRC/$w/list.txt" \
    -vf "fps=30" -c:v libx264 -pix_fmt yuv420p -crf 19 -an "$SRC/$w.mp4"
  printf "🎞  %-12s %s秒\n" "$w.mp4" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/$w.mp4")"
done
