// 開幕の「絵だけの1.2秒」を撮る（案内カードが浮かび上がる前・src/page.html の開幕の時間割）。
//   NODE_PATH=../shikifuda-kasane/node_modules node scripts/pv/capture-open.js <出力ファイル>
// capture-pv.js は ready（カードが出きった状態）を待ってから録り始めるので、この1.2秒は写らない。
// この間は絵の不透明度が変わるだけで盤は動いていないため、静止画1枚で足りる。
const puppeteer = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.argv[2] || path.join(__dirname, "opening.png");
const MIME = { html: "text/html", js: "text/javascript", webp: "image/webp", png: "image/png", m4a: "audio/mp4" };
const srv = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; const f = path.join(ROOT, rel); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.writeHead(404).end(); r.writeHead(200, { "Content-Type": MIME[path.extname(f).slice(1)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
srv.listen(0, async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--hide-scrollbars"], defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  const p = await b.newPage();
  await p.setRequestInterception(true); p.on("request", (r) => (/waiwai\.town/.test(r.url()) ? r.abort() : r.continue()));
  await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 700));   // 絵だけの1.2秒の途中（カードは opacity 0）
  const a = await p.evaluate(() => +getComputedStyle(document.querySelector("#title-overlay .card")).opacity);
  await p.screenshot({ path: OUT });
  console.log("📸 " + path.basename(OUT) + "（案内カードの不透明度 " + a + "）");
  await b.close(); srv.close();
});
