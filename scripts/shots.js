// ちょい出し用の実プレイ静止画を撮る。
//   NODE_PATH=../shikifuda-kasane/node_modules node scripts/shots.js [出力先フォルダ]
//
// **自動プレイ（#autotest）では撮らない。**自動は「札が出た瞬間に叩く」ので、盤の上は
// すべて浄めたあとの色の札になり、**闇の札が一枚も写らない**（＝人が見ている画面ではない）。
// ここでは人と同じ間合い＝「下まで落ちてきた札を叩く」で進め、各曲の空で1枚ずつ撮る。
// 撮るのは叩いた直後（浄めの金環が出ている・下は色、上は闇の札）。
// canvas を直取りする（page.screenshot は空の絵を入れたあと frame が外れて落ちる・DEVELOPMENT）。
const puppeteer = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.argv[2] || path.join(ROOT, "scripts", "pv", "shots");
const MIME = { html: "text/html", js: "text/javascript", m4a: "audio/mp4", wav: "audio/wav", mp3: "audio/mpeg", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 叩く高さ（論理px・MISS_Y=540）。ここまで落ちてから叩く＝盤の上に闇の札が2〜3行たまった状態になる
const TAP_Y = 340;
// 撮る場面: 曲の切り替わりは 96／218／318／453／597 枚（実測）。各曲の真ん中あたりで1枚
const MARKS = [
  { n: 55, name: "1-kojo-荒城の月" },      // 城跡・月が浮かび上がる
  { n: 160, name: "2-oboro-朧月夜" },      // 菜の花と靄
  { n: 270, name: "3-sakura-さくらさくら" },  // 夜桜・花弁
  { n: 390, name: "4-eclipse-山の魔王" },  // 血月（金の月が消える）
  { n: 520, name: "5-gekko-月光" },        // 湖面・月が還る
  { n: 610, name: "6-hamabe-浜辺の歌" },   // 夜明け前の浜辺
];
function serve() { return new Promise((res) => { const s = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; const f = path.join(ROOT, rel); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(f).slice(1)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }); s.listen(0, () => res(s)); }); }
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const errors = []; page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.setRequestInterception(true); page.on("request", (r) => (/waiwai\.town/.test(r.url()) ? r.abort() : r.continue()));   // 本物を残すと本番の番付が汚れる
  await page.evaluateOnNewDocument(() => {   // 撮影でも番付へは触らない
    Object.defineProperty(window, "waiwai", { configurable: true, value: {
      mode: "bridged", load: () => Promise.resolve(null), save: () => Promise.resolve(true),
      submitScore: () => Promise.resolve({ ok: true }), getMyScore: () => Promise.resolve(null), getTopScores: () => Promise.resolve({ entries: [], total: 0 }),
    } });
  });
  await page.goto(base, { waitUntil: "load" });
  await page.waitForFunction(() => { const ov = document.getElementById("title-overlay"), c = ov.querySelector(".card"); return ov.classList.contains("ready") && +getComputedStyle(c).opacity >= 0.95; }, { polling: 50, timeout: 15000 });
  await page.click("#start-silent");   // 音は要らない（撮るのは画）
  const box = await page.$eval("#game", (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const laneX = (l) => box.x + (box.w / 4) * (l + 0.5), midY = box.y + box.h / 2;
  const snap = async (name) => { const d = await page.evaluate(() => document.getElementById("game").toDataURL("image/png")); const f = path.join(OUT, name + ".png"); fs.writeFileSync(f, Buffer.from(d.split(",")[1], "base64")); console.log("📸 " + name + ".png"); };
  const marks = MARKS.slice(); const t0 = Date.now(); let s = null, taps = 0;
  while (Date.now() - t0 < 600000) {
    s = await page.evaluate(() => window.__stats());
    if (s.over) break;
    if (s.y === undefined) { await sleep(20); continue; }
    if (s.y < TAP_Y) { await sleep(20); continue; }
    const before = s.purified;
    await page.mouse.click(laneX(s.lane), midY); taps++;
    try { await page.waitForFunction((b) => window.__stats().purified > b || window.__stats().over, { polling: "raf", timeout: 3000 }, before); } catch (e) { errors.push("tap: " + e.message); break; }
    // 撮るのは叩いた直後＝金環が出ていて、下は色の札・上は闇の札。落ちの余裕もいちばん大きい
    if (marks.length && before + 1 >= marks[0].n) { const m = marks.shift(); await snap(m.name); }
    if (!marks.length) break;
  }
  const fin = await page.evaluate(() => window.__stats());
  console.log(JSON.stringify({ 浄めた枚数: fin.purified, 曲: fin.song, 夜明け: fin.over, 叩いた回数: taps, 撮り残し: marks.map((m) => m.name), 通し秒: +((Date.now() - t0) / 1000).toFixed(1), errors }));
  await browser.close(); srv.close();
  process.exit(marks.length ? 1 : 0);
})();
