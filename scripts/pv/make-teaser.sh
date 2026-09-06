#!/bin/bash
# チラ見せ用（X投稿・縦720×1280・10.2秒・**音つき**）
#   bash scripts/pv/make-teaser.sh <素材フォルダ> [出力]
#
# **わいわいタウンのプレビュー動画を流用しない。**あちらは規格で無音・正方形（掲載タイルの中で回る前提）。
# この作の引きは「叩くたび琴が鳴る」ことなので、チラ見せは音つき・縦（盤の上の空と月まで入る）にする。
# 題字も帳も終わりのカードも出さない——チラ見せは覗き見なので、1コマ目から札が落ちている。
#
#   A 曲が替わる（鐘 → 弁天「月に、靄の帯がかかりんす」）  w2 [2.40, 6.90]  4.50s
#   B 血月（山の魔王）                                      w3 [1.50, 7.50]  6.00s
#   0.3秒の重ね替えで繋ぐ＝合計 10.20s（音も同じ長さで acrossfade）
set -e
SRC="${1:?素材フォルダを渡す}"; OUT="${2:-media/kiyome-teaser.mp4}"; T="$SRC/teaser"; mkdir -p "$T"
V="-c:v libx264 -pix_fmt yuv420p -r 30 -crf 19 -an"
ffmpeg -y -v error -ss 2.40 -t 4.50 -i "$SRC/w2-switch.mp4"  $V "$T/a.mp4"
ffmpeg -y -v error -ss 1.50 -t 6.00 -i "$SRC/w3-eclipse.mp4" $V "$T/b.mp4"
ffmpeg -y -v error -i "$T/a.mp4" -i "$T/b.mp4" -filter_complex "[0][1]xfade=transition=fade:duration=0.3:offset=4.2,format=yuv420p" $V "$T/video.mp4"
# 音は PCM に落としてから切る（webm(opus) のまま atrim すると先頭の壊れたパケットでずれる・assemble.sh 参照）
[ -f "$SRC/seg/full.wav" ] || ffmpeg -y -v error -i "$SRC/audio.webm" -c:a pcm_s16le "$SRC/seg/full.wav"
ffmpeg -y -v error -ss 89.379 -t 4.50 -i "$SRC/seg/full.wav" -c:a pcm_s16le "$T/a.wav"
ffmpeg -y -v error -ss 202.29 -t 6.00 -i "$SRC/seg/full.wav" -c:a pcm_s16le "$T/b.wav"
# 重ね替えの所で鐘と琴が重なり、素のままだと AAC 化後に 0.0dB へ張り付いた（＝割れる）ので -2dB 下げる。
# **alimiter は使わない**——既定で level=true（頭打ちのぶんだけ持ち上げ直す）ため、かえって -0.6dB まで上がった
ffmpeg -y -v error -i "$T/a.wav" -i "$T/b.wav" -filter_complex "[0][1]acrossfade=d=0.3:c1=tri:c2=tri,afade=t=out:st=9.4:d=0.8,volume=-2dB[o]" -map "[o]" -c:a pcm_s16le "$T/audio.wav"
ffmpeg -y -v error -i "$T/video.mp4" -i "$T/audio.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart "$OUT"
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -of default=nw=1 "$OUT"
ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -show_entries format=duration,size -of default=nw=1 "$OUT"
