# 旋律の採譜（メインテーマ → 琴の譜）・2026-09-02

公式メインテーマ（https://vibe.co.jp/luna-occulta/media/music/kitan_maintheme.mp3）の歌の旋律を
機械で採譜した下書き。**音源そのもの（mp3・分離した歌声）はリポジトリに置かない**（曲のお約束＝単体再配布NG）。

手順（Irodori-TTS の venv に librosa/torch がある。demucs・torchcrepe は `uv pip install --target` で一時領域へ）:
1. `ffmpeg -i kitan_maintheme.mp3 -ac 1 -ar 22050 maintheme.wav`
2. `python -m demucs.separate -n htdemucs --two-stems=vocals -d cpu -o sep maintheme.wav`（CPUで約1分）
3. `crepe_grid.py <dir>`: torchcrepe(tiny) で音高 → 拍格子（grid.json・約96BPM・16分=0.157秒）へ量子化 → crepe_notes.json
   （full モデルは10秒に68秒かかるので使わない）
4. `clean.py <dir>`: F♯長調へ吸着・D♯5超は1オクターブ下げる・1セルの揺れを消す → phrases.json（Aメロ／Bメロ／サビ1〜3）
5. `hayashi-cho.template.html` の `__PHRASES__` に phrases.json を埋めて試聴ページにする

到達点: サビ3回分の音列の一致 0.46（整える前 0.18〜0.33）。**正誤は耳でしか決まらない。**

**採用（2026-09-02）**: 三系統（当方／Gemini／ChatGPT）のうち当方の `phrases.json`（Aメロ・Bメロ・サビ1〜3）をオーナーが採用し、
`src/game.js` の `MELODY` に焼き込んだ。理由は「音の上下があって遊んで良さそう」（正確さでは選んでいない）。
`gemini_transcription.md`・`chatgpt.musicxml` は比較のために控えているだけで、ゲームには使っていない。
