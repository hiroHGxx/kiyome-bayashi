# 浄めばやし

『月蝕綺譚 -Luna Occulta-』の**非公式二次創作**ファンゲームです。
（ここに一行で遊びの芯。スマホのブラウザでそのまま遊べます。）

**▶ 遊ぶ: https://hirohgxx.github.io/kiyome-bayashi/**

> **『月蝕綺譚』を知っている人向けのゲームです。**

## 遊び方

- （タップで何が起きるか）
- （どうなると終わりか）
- （何が伸びると嬉しいか）

## 番付（全国ランキング）

[わいわいタウン](https://waiwai.town/)の枠の中で遊ぶと、夜明けのあとに全国順位が出ます。順位の行を押すと**番付**（上位10人と自分）が開きます。

- 送る点は **合成値 `段 × 100 + 従の軸`**（上限がある作。青天井なら `×1000`）。ボードは `main`
- **送らない経路**: 一度も記録が無い人の0段の夜（番付に0の行を作らない）・稽古モード（題字3連打）・自動プレイのハッシュ
- 記録の置き場は SDK の `save`/`load`（キー `kiyome-bayashi_save`）。枠の外（Pages 直開き・Artifact）では端末内に残ります

## 開発

```bash
python3 scripts/fetch-fuda.py --chars anne,oto --ranks 10   # 台帳から札絵（URLを組み立てない）
node scripts/build-dist.js                                   # src/ → index.html（単一HTML）と dist/artifact.html
NODE_PATH=../shikifuda-kasane/node_modules node scripts/playtest.js   # 通し検証（送信0回を数える）
```

デバッグ用ハッシュ: `#autotest`（自動プレイ）／`#autocut`（わざと終わる）／`nofloat`（撮影用）。本番ルールで動くが記録も番付も触らない。

## 二次創作について・クレジット

本作は『月蝕綺譚 -Luna Occulta-』（Studio VIBE / CryptoNinja 外伝）の
[二次創作ガイドライン](https://vibe.co.jp/luna-occulta/fanworks)および
[CryptoNinja ガイドライン](https://www.ninja-dao.com/guidelines)に基づくファンメイド作品で、
**公式とは関係ありません**。

- **札絵**: 公式[素材蔵](https://vibe.co.jp/luna-occulta/fanworks/assets)配布の札絵を使用（「二次創作のゲーム・画像作品に組み込んでOK」のお約束に基づく）。URLは公式MCP `kitan-lore` の台帳の値をそのまま使っています
- **効果音**: （公式配布のミニゲーム音源 `maai` から／WebAudio 自作）
- **BGM**: 公式素材蔵配布の（曲名）を使用。楽曲の単体利用・再配布はできません
- **ボイス**: （無し／Irodori-TTS でローカル生成／公式指定の ElevenLabs Voice ID）
- **AI生成**: （Lovart で生成したもの。正典シートを参照資料として）
- 正典シートの原本はこのリポジトリには含めていません
- 音が出ないときは、本体のマナーモード（サイレントスイッチ）を確認してください

キャラクター・楽曲および原作の権利は原権利者（Studio VIBE / CryptoNinja）に帰属します。
本作は無料で公開しており、収益化はしていません。
