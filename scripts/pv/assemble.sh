#!/bin/bash
# 浄めばやし PV 組み立て（縦720×1280・26.2秒・本作の実音だけで音を付ける）
#   bash scripts/pv/assemble.sh <素材フォルダ> [出力]
#
# 型は kitan-works/docs/MEDIA.md「PVの型」（シネマ → 実機プレイ＋テロップ → 見せ場 →
# キャラ総見せ → CTAエンドカード）。素材は capture-pv.js の1回の走り（画は窓3つ・音は通し）。
#
# ── 場面表 ─────────────────────────────────────────────────
#   S0 開幕の絵（案内カードが浮かぶ前の1.2秒・静止画）                            1.50s  PV  0.00
#   S1 帳がひらく → 弁天「ぬしさん、唄に付き合いなんし」            w1 [0.424, 4.124]  3.70s  PV  1.50
#   S2 序盤のプレイ ＋ テロップa                                     w1 [4.40, 10.40]   6.00s  PV  5.20
#   S3 曲が替わる（鐘 → 弁天「月に、靄の帯がかかりんす」）           w2 [2.40,  6.40]   4.00s  PV 11.20
#      （切り替わりは w2 の映像内 4.24s ＝ この場面の 1.84s 地点）
#   S4 血月（山の魔王）＋ テロップb                                  w3 [1.50,  6.50]   5.00s  PV 15.20
#   S5 札絵の総見せ（弁天・宇迦・ネム・咲耶・大蛇／各0.9s）                   4.50s  PV 20.20
#   S6 終わりのカード（CTA）                                                 3.00s  PV 24.70
#   合計 27.70s（PVの仕様は 25〜30秒・docs/MEDIA.md「媒体別の仕様」）
#
# ── 音（すべて本作の実音。ffmpeg で近似合成しない・MEDIA.md）──────────
# 録画と同じ1回の走りで WebAudio を tee して録った audio.webm から切る。
# 窓の頭が音の時計で何秒かは meta.json の audioFrom（w1 -0.424 / w2 86.979 / w3 200.79）。
#   a1 [  0.000,  3.700]  S1（帳と開幕の声）
#   a2 [  3.976,  9.976]  S2（琴が一音ずつ）
#   a3 [ 89.379, 93.379]  S3（鐘と節目の声）
#   a4 [202.290,207.290]  S4（速くなった琴）
#   a5 [151.000,158.500]  S5+S6（さくらさくらの頃の琴。**録画の尻は209.4秒で足りない**ので
#                          同じ走りの別の所から採る。合成音ではなく実音のまま・末尾2.5秒で落とす）
set -e
SRC="${1:?素材フォルダを渡す}"; OUT="${2:-media/kiyome-bayashi-pv.mp4}"
D="$(cd "$(dirname "$0")" && pwd)"; T="$SRC/seg"
mkdir -p "$T"
V="-c:v libx264 -pix_fmt yuv420p -r 30 -crf 19 -an"
# --- 画 ---
# S0 開幕の絵だけの1.2秒（capture-open.js。案内カードが浮かぶ前＝この作の顔）。まだ音は鳴っていない
ffmpeg -y -v error -loop 1 -t 1.500 -i "$D/opening.png" -vf "fps=30,fade=in:st=0:d=0.5,format=yuv420p" $V "$T/v0.mp4"
ffmpeg -y -v error -ss 0.424 -t 3.700 -i "$SRC/w1-opening.mp4" $V "$T/v1.mp4"
ffmpeg -y -v error -ss 4.400 -t 6.000 -i "$SRC/w1-opening.mp4" -loop 1 -framerate 30 -t 6.000 -i "$D/telop_a.png" \
  -filter_complex "[1]format=rgba,fade=in:st=0.3:d=0.5:alpha=1,fade=out:st=5.2:d=0.5:alpha=1[t];[0][t]overlay=(W-w)/2:980" $V "$T/v2.mp4"
ffmpeg -y -v error -ss 2.400 -t 4.000 -i "$SRC/w2-switch.mp4"  $V "$T/v3.mp4"
ffmpeg -y -v error -ss 1.500 -t 5.000 -i "$SRC/w3-eclipse.mp4" -loop 1 -framerate 30 -t 5.000 -i "$D/telop_b.png" \
  -filter_complex "[1]format=rgba,fade=in:st=0.3:d=0.5:alpha=1,fade=out:st=4.2:d=0.5:alpha=1[t];[0][t]overlay=(W-w)/2:980" $V "$T/v4.mp4"
# 総見せ: 5柱を 0.9s ずつ・0.25s の重ね替え（zoompan は使わない＝切り取り枠の丸めで揺れる・MEDIA.md）
ffmpeg -y -v error -loop 1 -t 1.1 -i "$SRC/m_1.png" -loop 1 -t 1.1 -i "$SRC/m_2.png" -loop 1 -t 1.1 -i "$SRC/m_3.png" \
  -loop 1 -t 1.1 -i "$SRC/m_4.png" -loop 1 -t 1.1 -i "$SRC/m_5.png" \
  -filter_complex "[0][1]xfade=fade:0.25:0.85[a];[a][2]xfade=fade:0.25:1.70[b];[b][3]xfade=fade:0.25:2.55[c];[c][4]xfade=fade:0.25:3.40,fps=30,format=yuv420p[v]" \
  -map "[v]" -t 4.500 $V "$T/v5.mp4"   # 合計 = 5×1.1 − 4×0.25 = 4.50s（尺は足し算で出す・-t では伸ばせない）
ffmpeg -y -v error -loop 1 -t 3.000 -i "$D/endcard.png" -vf "fps=30,format=yuv420p" $V "$T/v6.mp4"
printf "file 'v0.mp4'\nfile 'v1.mp4'\nfile 'v2.mp4'\nfile 'v3.mp4'\nfile 'v4.mp4'\nfile 'v5.mp4'\nfile 'v6.mp4'\n" > "$T/vlist.txt"
ffmpeg -y -v error -f concat -safe 0 -i "$T/vlist.txt" -c copy "$T/video.mp4"
# --- 音 ---
# **webm(opus) のまま atrim で切らない。**先頭のパケットが壊れていて、切り出しが合計1.74秒ずれた
# （2026-09-05・実測）。いったん PCM に落としてから -ss/-t で切る＝各スライスが指定どおりの尺になる。
ffmpeg -y -v error -i "$SRC/audio.webm" -c:a pcm_s16le "$T/full.wav"
i=0
while read -r ss t; do i=$((i+1)); ffmpeg -y -v error -ss $ss -t $t -i "$T/full.wav" -c:a pcm_s16le "$T/a$i.wav"; done <<'EOF'
0 3.7
3.976 6.0
89.379 4.0
202.29 5.0
151.0 7.5
EOF
ffmpeg -y -v error -f lavfi -t 1.5 -i anullsrc=r=48000:cl=stereo -i "$T/a1.wav" -i "$T/a2.wav" -i "$T/a3.wav" -i "$T/a4.wav" -i "$T/a5.wav" \
  -filter_complex "[0][1][2][3][4][5]concat=n=6:v=0:a=1,afade=t=out:st=25.2:d=2.5[out]" -map "[out]" -c:a pcm_s16le "$T/audio.wav"

# --- 合わせる ---
ffmpeg -y -v error -i "$T/video.mp4" -i "$T/audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -shortest -movflags +faststart "$OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name,r_frame_rate -of default=nw=1 "$OUT"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -show_entries format=duration,size -of default=nw=1 "$OUT"
echo "  規格: 縦720×1280・25〜30秒・BGM＋ボイス可 → docs/MEDIA.md"
