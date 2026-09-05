// PV の文字カードを撮る（テロップ2枚＝透過・終わりのカード1枚＝720×1280）。
//   NODE_PATH=../shikifuda-kasane/node_modules node scripts/pv/make-cards.js
// 色は data/design-tokens.json の系（宵闇藍 #131320/#1B1B2E・金泥 #D9A94C/#F0CE7E・墨 #E8E4D8・補助 #9D93B5）。
// 新しい色を発明しない。#7C7396 は使わない。文字は12px未満を使わない。
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
// 月の絵は data URI で埋める（setContent には基準URLが無く、相対パスは解決できない）
const MOON = "data:image/webp;base64," + fs.readFileSync(path.join(__dirname, "..", "..", "assets", "art", "sky", "moon.webp")).toString("base64");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", OUT = __dirname;
const FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;700;800&display=swap">';
const BASE = `${FONT}<style>*{margin:0;padding:0;box-sizing:border-box}
 body{width:720px;font-family:"Shippori Mincho B1","Hiragino Mincho ProN",serif;color:#E8E4D8}</style>`;
// テロップ（実機プレイの上に重ねる・地は透過）
const telop = (main, sub) => `${BASE}<style>
 body{height:200px;background:transparent;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:14px}
 .m{font-size:40px;font-weight:800;letter-spacing:.10em;color:#F0CE7E;white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.95),0 0 30px rgba(0,0,0,.8)}
 .s{font-size:25px;font-weight:500;letter-spacing:.10em;color:#E8E4D8;white-space:nowrap;text-shadow:0 2px 12px rgba(0,0,0,.95)}
</style><div class="m">${main}</div><div class="s">${sub}</div>`;
// 終わりのカード（CTA）
const endcard = `${BASE}<style>
 body{height:1280px;background:radial-gradient(ellipse at 50% 42%,#1B1B2E 0%,#131320 66%);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0}
 .moon{position:absolute;top:150px;left:50%;transform:translateX(-50%);width:300px;height:300px;
   background:url("${MOON}") center/contain no-repeat;opacity:.9;mix-blend-mode:screen}   /* 月は黒地の一枚絵＝本体と同じく lighter 相当で抜く */
 h1{margin-top:150px;font-size:104px;font-weight:800;letter-spacing:.14em;
   background:linear-gradient(168deg,#f6e5ae 15%,#D9A94C 55%,#F0CE7E 85%);-webkit-background-clip:text;background-clip:text;color:transparent;
   filter:drop-shadow(0 0 26px rgba(240,206,126,.4)) drop-shadow(0 3px 10px rgba(0,0,0,.7))}
 .sub{margin-top:26px;font-size:27px;letter-spacing:.12em;color:#E8E4D8}
 .url{margin-top:78px;font-size:30px;letter-spacing:.06em;color:#F0CE7E;border:2px solid #6D5A33;border-radius:10px;padding:20px 30px}
 .note{margin-top:24px;font-size:24px;letter-spacing:.10em;color:#9D93B5}
 .credit{position:absolute;bottom:66px;font-size:20px;letter-spacing:.10em;color:#9D93B5;text-align:center;line-height:1.8}
</style><div class="moon"></div>
 <h1>浄めばやし</h1>
 <div class="sub">四筋を落ちる闇の札を、下から順に叩く</div>
 <div class="url">hirohgxx.github.io/kiyome-bayashi</div>
 <div class="note">ブラウザでそのまま遊べます</div>
 <div class="credit">『月蝕綺譚 -Luna Occulta-』二次創作ファンゲーム<br>公式とは関係ありません</div>`;
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const p = await b.newPage();
  const shot = async (html, file, w, h, transparent) => {
    await p.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await p.setContent(html, { waitUntil: "load" });
    await p.evaluate(async () => { await document.fonts.ready; });
    await new Promise((r) => setTimeout(r, 400));   // 字体が実際に差し替わるまで待つ
    await p.screenshot({ path: path.join(OUT, file), omitBackground: !!transparent });
    console.log("📇 " + file);
  };
  await shot(telop("四筋を落ちる闇の札だけを叩く", "見るのは筋だけ・指の高さは要らない"), "telop_a.png", 720, 200, true);
  await shot(telop("叩くたび、琴が名曲を継いでゆく", "曲が一巡すると、次の曲と次の空へ"), "telop_b.png", 720, 200, true);
  await shot(endcard, "endcard.png", 720, 1280, false);
  await b.close();
})();
