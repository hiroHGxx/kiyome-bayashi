# 後片付け（dry-run と結果） — 2026-09-02 / run q8h3

## 作られたもの

| 対象 | 種類 | 場所 | 操作 | 復元可否 |
|---|---|---|---|---|
| `kiyome-bayashi_save` 相当のキー（best/title/titleRank/sound/clears/spirits/songMax） | localStorage | origin `http://127.0.0.1:<自動割当ポート>`（UT専用・stub SDK 遮断時の直書き） | 作成 | browser context を閉じた時点で消滅 |
| `waiwai:kiyome-bayashi_save` | localStorage | 同上（stub SDK の `save()` が localStorage 経由で保存） | 作成 | 同上（context 使い捨て） |
| 観察スクリプト（observe.js〜observe8.js） | ファイル | セッションの scratchpad | 作成 | リポジトリ外・そのまま |
| `obs-all.json` / `obs-all-part2.json` / `obs-all-part3.json` / `obs-whiff-retry.json` / `screenshots/`（29枚） | ファイル | この run ディレクトリ | 作成 | 成果物なので残す |

## 触らなかったもの

- **本番 origin（github.io）の記録**: 最初から触れていない
- **わいわいタウンの番付 `main_v1`**: `waiwai.town` 宛のリクエストは `setRequestInterception` で全件 `abort()`。stub SDK 越しの `submitScore`/`getTopScores` は自作の配列を返すだけで、本物の API には一度も届いていない
- ゲーム本体（`index.html` / `src/` / `assets/`）・`README.md` / `docs/SPEC.md` / `docs/DEVELOPMENT.md`: 1バイトも変えていない（読んだだけ。前工程からの未コミット差分もそのまま）

## 結果

puppeteer の browser context・配信サーバーはすべてスクリプト終了時に閉じた。baseline との差は `docs/ut/`（このUTの成果物）のみの新規追加。**cleanup: completed**。
