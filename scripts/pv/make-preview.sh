#!/bin/bash
# わいわいタウン用プレビュー動画（640×640・約12.8秒・無音・冒頭からプレー画面）
# 規格は docs/MEDIA.md「媒体別の仕様」。型は 御霊そろえ／月影とび の scripts/pv/make-preview.sh。
#
# 素材は capture-pv.js の窓2つ（同じ1回の走り）。**題字も帳も見せない**——
# タイルの hover 再生は最初の1〜2秒が勝負なので、1コマ目から札が落ちている所を出す。
#   A 朧月夜（曲が替わったあと・96枚）  w2-switch [2.0, 8.5]
#   B 血月（山の魔王・390枚）            w3-eclipse [2.0, 8.5]   ＝登り調子で繋ぐ
#
# 正方形の切り出しは **y=475 から 720px**（720×1280 の中で盤は y=115〜1195）。
# 盤の下端に合わせる＝叩く場所（いちばん下の札）が必ず入る。中ほどで切ると月は大きく写るが、
# 手が届く所が切れて「何をする画か」が伝わらない。
set -e
SRC="${1:?素材フォルダを渡す（capture-pv.js の出力先）}"
OUT="${2:-media/waiwai-preview.mp4}"
CROP="crop=720:720:0:475,scale=640:640,fps=30,format=yuv420p"
ffmpeg -y -v error -ss 2.0 -t 6.5 -i "$SRC/w2-switch.mp4"  -vf "$CROP" -c:v libx264 -crf 18 -an "$SRC/pA.mp4"
ffmpeg -y -v error -ss 2.0 -t 6.5 -i "$SRC/w3-eclipse.mp4" -vf "$CROP" -c:v libx264 -crf 18 -an "$SRC/pB.mp4"
ffmpeg -y -v error -i "$SRC/pA.mp4" -i "$SRC/pB.mp4" \
  -filter_complex "[0][1]xfade=transition=fade:duration=0.25:offset=6.25,format=yuv420p" \
  -c:v libx264 -crf 20 -pix_fmt yuv420p -r 30 -an -movflags +faststart "$OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -show_entries format=duration,size -of default=nw=1 "$OUT"
echo "  規格: 640×640・5〜15秒・無音・10MB以内・冒頭からプレー画面 → docs/MEDIA.md"
