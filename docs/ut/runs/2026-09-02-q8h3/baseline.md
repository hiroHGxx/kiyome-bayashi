# baseline — 2026-09-02 / run q8h3

UT開始前に控えた状態。**本番 origin（https://hirohgxx.github.io/）とわいわいタウンには一切触れていない。**

| 対象 | 開始前 | 取得方法 |
|---|---|---|
| localStorage（http://127.0.0.1:&lt;自動割当ポート&gt; origin） | `{}`（空）— 観察スクリプトが新しい browser context で開くため、開始時点で必ず空 | 開いた直後に `Object.entries(localStorage)` 相当を各 context で確認 |
| localStorage（本番 origin） | **未取得・未変更**（本番では実施しないため触れていない） | — |
| わいわいタウンの番付 `main_v1` | **未取得・未変更**（`waiwai.town` 宛リクエストは `page.setRequestInterception` で全件遮断し、stub SDK に差し替えて実施） | — |
| リポジトリの作業ツリー | `docs/ut/` 以外は無改変。着手前の `git status --short` は `README.md` / `docs/DEVELOPMENT.md` / `docs/SPEC.md` / `index.html` / `scripts/playtest.js` / `src/game.js` / `src/page.html`（前工程からの未コミット差分）と、新規 `assets/` 素材群・`scripts/melody/` `scripts/sky/`（いずれも実装担当の既存作業。本UTでは1バイトも触っていない） | `git status --short`（着手前に確認） |
| 配信 | 観察スクリプト（Node.js + puppeteer-core + Google Chrome 実機バイナリ）が `http://127.0.0.1:<自動割当ポート>/` でこのリポジトリを配信し、終了時に閉じる | 起動時に `waitUntil: "load"` の成功を確認 |

作られるデータは UT 用 origin の localStorage（`kiyome-bayashi_save` 相当のキー・`waiwai:kiyome-bayashi_save`）だけで、browser context を閉じれば消える。
**不可逆・外部影響の操作は存在しない**（`window.waiwai` は自作 stub に差し替え、実際の `submitScore`/`save` は一度も呼ばれていない）。
