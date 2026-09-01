// 通し検証（puppeteer-core・実時間）。sdk.js を遮断して stub を置き、自動プレイ／稽古／手で遊ぶ流れで
// 「終わりまで行く・記録が残る／残らない・番付へ送らない夜は送信0回」を数える。
//   NODE_PATH=../shikifuda-kasane/node_modules node scripts/playtest.js
const puppeteer = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MIME = { html: "text/html", js: "text/javascript", m4a: "audio/mp4", wav: "audio/wav", mp3: "audio/mpeg", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function serve() { return new Promise((res) => { const s = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; const f = path.join(ROOT, rel); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(f).slice(1)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }); s.listen(0, () => res(s)); }); }
async function open(base, hash, { withRecord } = {}) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" }); const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 });
  const errors = []; page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.setRequestInterception(true); page.on("request", (r) => /waiwai\.town/.test(r.url()) ? r.abort() : r.continue());   // 本物を残すと本番の番付が汚れる
  await page.evaluateOnNewDocument((withRecord) => {
    window.__submits = [];
    Object.defineProperty(window, "waiwai", { configurable: true, value: {
      mode: "bridged", load: (k) => Promise.resolve(withRecord && /_save$/.test(k) ? { best: 5, title: "宵の口", titleRank: 5, sound: "on" } : null),
      save: (k, v) => { try { localStorage.setItem("waiwai:" + k, JSON.stringify(v)); } catch (e) {} return Promise.resolve(true); },
      submitScore: (b, sc, meta) => { window.__submits.push([b, sc, meta || null]); return Promise.resolve({ ok: true, best: sc, rank: 2, improved: true }); },
      getMyScore: () => Promise.resolve(null), getTopScores: () => Promise.resolve({ entries: [{ rank: 1, name: "ヒロ", score: 1204 }], total: 2 }),
    } });
  }, !!withRecord);
  await page.goto(base + hash, { waitUntil: "load" });
  return { browser, page, errors };
}
const state = (p) => p.evaluate(() => ({ stats: (window.__stats && window.__stats()) || null, floors: document.getElementById("score").textContent, best: document.getElementById("best").textContent, over: document.getElementById("overlay").classList.contains("show"), rankLine: !document.getElementById("final-rank-line").hidden, saved: localStorage.getItem("waiwai:" + (window.SAVE_KEY || "")), submits: window.__submits.length }));
const ready = (p) => p.waitForFunction(() => { const ov = document.getElementById("title-overlay"), c = ov.querySelector(".card"); return ov.classList.contains("ready") && +getComputedStyle(c).opacity >= 0.95; }, { polling: 50, timeout: 15000 });
const tap = async (p) => { const r = await p.$eval("#game", (e) => { const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; }); await p.mouse.click(r.x, r.y); };
(async () => {
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/index.html`; let failed = false;
  const check = (name, ok, r) => { console.log((ok ? "✅ " : "❌ ") + name + " " + JSON.stringify(r)); if (!ok) failed = true; };
  // ① 自動プレイで終わりまで（記録は残る・番付へは送らない）
  { const { browser, page, errors } = await open(base, "#autotest"); const t0 = Date.now();
    // 通しながら盤を覗く: 同じ柱が同時に二枚出ていないか（出ると「絵が壊れた」に見える・2026-09-01 実画面で踏んだ）
    let samples = 0, dup = 0, worst = null;
    const watch = setInterval(async () => { try { const ids = await page.evaluate(() => (window.__stats && window.__stats().ids) || []); if (!ids.length) return; samples++; const seen = new Set(); for (const i of ids) { if (seen.has(i)) { dup++; worst = i; break; } seen.add(i); } } catch (e) {} }, 200);
    await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), { polling: 300, timeout: 240000 }); clearInterval(watch);
    const s = await state(page); const mangan = s.stats && s.stats.manganAt ? +(s.stats.manganAt / 1000).toFixed(1) : null;
    check("自動プレイが百八枚を通せる・送信0", s.over && +s.floors >= 108 && s.submits === 0 && errors.length === 0, { floors: s.floors, 満願まで秒: mangan, 通し秒: +((Date.now() - t0) / 1000).toFixed(1), pillars: s.stats && s.stats.pillars, submits: s.submits, errors });
    check("満願までが 60〜120 秒（受け入れ基準2）", mangan !== null && mangan >= 60 && mangan <= 120, { 満願まで秒: mangan });
    check("同じ柱が盤に二枚出ない", samples > 100 && dup === 0, { 覗いた回数: samples, 重なり: dup, 例: worst }); await browser.close(); }
  // ② わざと終わる
  { const { browser, page, errors } = await open(base, "#autocut"); await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), { polling: 300, timeout: 60000 }); const s = await state(page); check("わざと終わる・送信0", s.over && s.submits === 0 && errors.length === 0, { ...s, errors }); await browser.close(); }
  // ③ 稽古は記録を残さない
  { const { browser, page, errors } = await open(base, "#autotest=20"); await ready(page); await page.evaluate(() => { const l = document.querySelector(".game-title"); for (let i = 0; i < 3; i++) l.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); }); await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), { polling: 300, timeout: 120000 }); const s = await state(page); const sv = JSON.parse(s.saved || "{}"); check("稽古は記録を残さない・送信0", s.over && s.best === "0" && !(sv.best > 0) && s.submits === 0 && errors.length === 0, { ...s, errors }); await browser.close(); }
  // ④ 手で遊ぶ（押せるまで待つ→月夜に入る→0で終わる→記録なしなら送らない）
  { const { browser, page, errors } = await open(base, ""); await ready(page); await page.click("#start"); await sleep(1200); await page.evaluate(() => window.__forceOver && window.__forceOver()); await sleep(800); const s = await state(page); check("手で遊ぶ・記録が無い人の0は送らない", s.over && s.submits === 0 && !s.rankLine && errors.length === 0, { ...s, errors }); await browser.close(); }
  srv.close(); process.exit(failed ? 1 : 0);
})();
