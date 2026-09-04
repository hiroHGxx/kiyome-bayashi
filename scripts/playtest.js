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
  const ONLY = process.env.ONLY || "";   // ONLY=5 のように1本だけ回す
  const check = (name, ok, r) => { console.log((ok ? "✅ " : "❌ ") + name + " " + JSON.stringify(r)); if (!ok) failed = true; };
  // ① 自動プレイで終わりまで（記録は残る・番付へは送らない）
  if (!ONLY || ONLY === "1") { const { browser, page, errors } = await open(base, "#autotest"); const t0 = Date.now();
    // 通しながら盤を覗く: 同じ柱が同時に二枚出ていないか（出ると「絵が壊れた」に見える・2026-09-01 実画面で踏んだ）
    let samples = 0, dup = 0, worst = null;
    const watch = setInterval(async () => { try { const ids = await page.evaluate(() => (window.__stats && window.__stats().ids) || []); if (!ids.length) return; samples++; const seen = new Set(); for (const i of ids) { if (seen.has(i)) { dup++; worst = i; break; } seen.add(i); } } catch (e) {} }, 200);
    await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), { polling: 300, timeout: 240000 }); clearInterval(watch);
    const s = await state(page); const sw = s.stats && s.stats.switchAt ? +(s.stats.switchAt / 1000).toFixed(1) : null;
    check("自動プレイが2曲目まで通せる（96枚超）・送信0", s.over && +s.floors >= 96 && s.submits === 0 && errors.length === 0, { floors: s.floors, 二曲目まで秒: sw, 通し秒: +((Date.now() - t0) / 1000).toFixed(1), pillars: s.stats && s.stats.pillars, submits: s.submits, errors });
    check("2曲目に入るまでが 60〜120 秒（受け入れ基準2）", sw !== null && sw >= 60 && sw <= 120, { 二曲目まで秒: sw });
    check("同じ柱が盤に二枚出ない", samples > 100 && dup === 0, { 覗いた回数: samples, 重なり: dup, 例: worst });
    // 束に柱ごとの枚数が残る（SPEC §7・図鑑の元）。SDK 経路（waiwai: の鍵）で数える
    { const sv = JSON.parse(s.saved || "{}"); const sp = sv.spirits || {}; const ids = Object.keys(sp); const sum = ids.reduce((a, k) => a + sp[k], 0);
      check("夜の柱が束へ残る（spirits）", ids.length === 29 && sum === +s.floors, { 柱数: ids.length, 枚数の和: sum, 浄めた枚数: +s.floors }); }
    // 図鑑（29柱・浄めた柱が灯る）。下まで送っても ✕ が残ることを数える＝札ごと送ると閉じられなくなる
    { const zk = await page.evaluate(() => {
        document.getElementById("zukan-open").click();
        const g = document.getElementById("zk-grid"), card = document.querySelector("#zukan .bz-card"), cells = [...g.children];
        const src = (c) => c.firstChild.getAttribute("src") || "";
        const lit = cells.filter((c) => c.classList.contains("lit")), dark = cells.filter((c) => !c.classList.contains("lit"));
        const open = document.getElementById("zukan").classList.contains("show");
        card.scrollTop = card.scrollHeight; g.scrollTop = g.scrollHeight;   // どちらが送る側でも下まで送る
        const x = document.getElementById("zk-close").getBoundingClientRect();
        document.getElementById("zk-close").click();
        return { open, 升目: cells.length, 灯: lit.length, 段10: lit.filter((c) => /_10\./.test(src(c))).length, 段03: dark.filter((c) => /_03\./.test(src(c))).length,
          閉じ釦が見える: x.top >= 0 && x.bottom <= innerHeight, 閉じた: !document.getElementById("zukan").classList.contains("show") };
      });
      check("図鑑が29柱ぶん灯り、下まで送っても閉じられる", zk.open && zk.升目 === 29 && zk.灯 === 29 && zk.段10 === 29 && zk.閉じ釦が見える && zk.閉じた, zk); }
    await browser.close(); }
  // ② わざと終わる
  if (!ONLY || ONLY === "2") { const { browser, page, errors } = await open(base, "#autocut"); await page.waitForFunction(() => document.getElementById("overlay").classList.contains("show"), { polling: 300, timeout: 60000 }); const s = await state(page); check("わざと終わる・送信0", s.over && s.submits === 0 && errors.length === 0, { ...s, errors }); await browser.close(); }
  // ③ 稽古は記録を残さない
  if (!ONLY || ONLY === "3") { const { browser, page, errors } = await open(base, "#autotest=20"); await ready(page); await page.evaluate(() => { const l = document.querySelector(".game-title"); for (let i = 0; i < 3; i++) l.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); }); await page.waitForFunction(() => window.__stats && window.__stats().purified >= 20, { polling: 300, timeout: 120000 }); await page.evaluate(() => window.__forceOver && window.__forceOver()); await sleep(800); const s = await state(page); const sv = JSON.parse(s.saved || "{}"); check("稽古は記録を残さない・送信0", s.over && s.best === "0" && !(sv.best > 0) && Object.keys(sv.spirits || {}).length === 0 && s.submits === 0 && errors.length === 0, { ...s, errors }); await browser.close(); }
  // ④ 手で遊ぶ（押せるまで待つ→月夜に入る→0で終わる→記録なしなら送らない）
  if (!ONLY || ONLY === "4") { const { browser, page, errors } = await open(base, ""); await ready(page); await page.click("#start"); await sleep(1200); await page.evaluate(() => window.__forceOver && window.__forceOver()); await sleep(800); const s = await state(page); check("手で遊ぶ・記録が無い人の0は送らない", s.over && s.submits === 0 && !s.rankLine && errors.length === 0, { ...s, errors }); await browser.close(); }
  // ⑤ 延長620枚まで通す: 曲が 荒城の月→朧月夜→さくらさくら→山の魔王→月光→浜辺の歌 と曲の終わりで替わり、例外0（SPEC §4「曲が替わる夜」）。SHOTS= を付けると各曲の実画面を撮る
  //    覗きとスクショは直列に回す（setInterval の evaluate と screenshot を重ねると CDP が詰まって 180 秒で落ちた・2026-09-02）
  if (!ONLY || ONLY === "5") { const { browser, page, errors } = await open(base, "#autotest=620"); const shots = process.env.SHOTS; if (shots) fs.mkdirSync(shots, { recursive: true });
    const seen = []; const shotDone = new Set(); let last = -1, s = null; const t0 = Date.now();
    while (Date.now() - t0 < 480000) {
      await sleep(200); try { s = await state(page); } catch (e) { errors.push("state: " + e.message); break; } const st = s.stats;
      const snap = async (name) => { try { const d = await page.evaluate(() => document.getElementById("game").toDataURL("image/png")); fs.writeFileSync(path.join(shots, name), Buffer.from(d.split(",")[1], "base64")); } catch (e) { errors.push("snap: " + e.message); } };   // 盤（canvas）だけを直取り。page.screenshot は空の絵を入れたあと frame が外れて落ちた
      if (st && st.stage !== last) { last = st.stage; seen.push([st.stage, st.rank, st.purified, st.song]); if (shots) { await sleep(1300); await snap(`stage-${st.stage}-rank${st.rank}.png`); } }
      for (const mark of [24, 44, 140, 250, 360, 400, 470, 540, 600]) if (shots && st && st.purified >= mark && !shotDone.has(mark)) { shotDone.add(mark); await snap(`at-${mark}.png`); }   // 曲の途中の空（月が浮かぶ・朧・桜・血月・還る月・明け）
      if (s.over) break;
    }
    const ranks = seen.map((x) => x[1]).join("→"), songs = seen.map((x) => x[3]).join("→");
    check("延長620枚まで通り、曲の終わりで6曲が順に替わる・例外0", !!s && s.over && +s.floors >= 600 && songs === "荒城の月→朧月夜→さくらさくら→山の魔王→月光→浜辺の歌" && ranks === "06→08→09→10→10→10" && errors.length === 0, { floors: s && s.floors, 曲の推移: songs, 段の推移: ranks, 切り替わった枚数: seen.map((x) => x[2] + x[3]), 通し秒: +((Date.now() - t0) / 1000).toFixed(1), errors });
    await browser.close(); }
  srv.close(); process.exit(failed ? 1 : 0);
})();
