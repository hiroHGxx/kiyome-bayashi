// PV・プレビュー動画の素材を1回の走りで録る（画＝CDP screencast・音＝WebAudio を tee して MediaRecorder）。
//   NODE_PATH=../shikifuda-kasane/node_modules node scripts/pv/capture-pv.js <出力先>
//
// 型は shikifuda-kasane/scripts/pv/capture-purify-sound.js（docs/MEDIA.md「音つきで録る」）。
// **本体（src/game.js）は無改変。**AudioNode.prototype.connect をフックして audioCtx.destination へ
// 繋がる瞬間を捉え、同じ内容を MediaStreamAudioDestinationNode へ分岐させて MediaRecorder で録る。
//
// この作の事情:
//  - **自動プレイ（#autotest）では撮らない。**出た瞬間に叩くので闇の札が写らない（＝人が見る画面でない）。
//    ここでは shots.js と同じ人の間合い（下まで落ちてから叩く・y≥340）で叩く。実クリックなので
//    AudioContext も素直に開く（自動再生ポリシーの回避が要らない）
//  - 血月（山の魔王）は390枚＝約200秒かかる。**通しで録ると数百MBになる**ので、
//    録画は枚数で開け閉めして「要る場面だけ」を撮る（音は通しで録り、時計で切り出す）
const puppeteer = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.argv[2] || path.join(__dirname, "raw");
const MIME = { html: "text/html", js: "text/javascript", m4a: "audio/mp4", wav: "audio/wav", mp3: "audio/mpeg", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TAP_Y = 340;
// 録る窓（from/to は浄めた枚数。from:-1 は「始まる前から」）
const WINDOWS = [
  { name: "w1-opening", from: -1, to: 14 },   // 題字 → 帳がひらく → 弁天の開幕の声 → 序盤のプレイ
  { name: "w2-switch", from: 90, to: 106 },   // 曲が替わる（鐘 → 弁天「月に、靄の帯がかかりんす」）
  { name: "w3-eclipse", from: 368, to: 404 }, // 血月（山の魔王）＝見せ場
];
function serve() { return new Promise((res) => { const s = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split("?")[0]).replace(/^\/+/, "") || "index.html"; const f = path.join(ROOT, rel); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404).end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(f).slice(1)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }); s.listen(0, () => res(s)); }); }
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(); const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new",
    args: ["--window-size=720,1280", "--hide-scrollbars", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
    defaultViewport: { width: 720, height: 1280, deviceScaleFactor: 1 } });
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.setRequestInterception(true); page.on("request", (r) => (/waiwai\.town/.test(r.url()) ? r.abort() : r.continue()));   // 本番の番付は撮影の巻き添えにしない
  await page.evaluateOnNewDocument(() => {
    window.__audioBlobs = []; window.__audioStartAt = null;
    const origConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (typeof AudioDestinationNode !== "undefined" && dest instanceof AudioDestinationNode) {
        const ctx = dest.context;
        if (!ctx.__streamDest) {
          ctx.__streamDest = ctx.createMediaStreamDestination();
          try {
            const rec = new MediaRecorder(ctx.__streamDest.stream, { mimeType: "audio/webm;codecs=opus" });
            rec.ondataavailable = (e) => { if (e.data && e.data.size) window.__audioBlobs.push(e.data); };
            window.__audioStartAt = Date.now() / 1000; rec.start(200); window.__mediaRecorder = rec;
          } catch (e) { console.warn("[capture] MediaRecorder 開始に失敗", e); }
        }
        origConnect.call(this, ctx.__streamDest, ...rest);
      }
      return origConnect.apply(this, [dest, ...rest]);
    };
  });
  await page.goto(base, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => { const o = document.getElementById("title-overlay"), c = o && o.querySelector(".card"); return o && o.classList.contains("ready") && +getComputedStyle(c).opacity >= 0.95; }, { polling: 50, timeout: 20000 });

  const frames = []; let cur = null;
  const cdp = await page.createCDPSession();
  cdp.on("Page.screencastFrame", async (ev) => { if (cur) frames.push({ ts: ev.metadata.timestamp, data: ev.data, win: cur }); try { await cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }); } catch (e) {} });
  const startRec = async (name) => { cur = name; await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, everyNthFrame: 2 }); console.log("● 録画開始 " + name); };
  const stopRec = async () => { await cdp.send("Page.stopScreencast"); console.log("■ 録画停止 " + cur); cur = null; };

  const wins = WINDOWS.slice(); const events = []; let lastStage = -1;
  if (wins.length && wins[0].from < 0) await startRec(wins[0].name);
  await page.click("#start");   // 音あり（実クリック＝AudioContext が開く）
  const box = await page.$eval("#game", (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const t0Wall = Date.now() / 1000;
  while (Date.now() / 1000 - t0Wall < 420) {
    const s = await page.evaluate(() => window.__stats());
    if (s.stage !== lastStage) { lastStage = s.stage; events.push({ t: Date.now() / 1000, ev: "song", stage: s.stage, song: s.song, n: s.purified }); }
    if (s.over) { events.push({ t: Date.now() / 1000, ev: "over", n: s.purified }); break; }
    const w = wins[0];
    if (w && cur === null && s.purified >= w.from && w.from >= 0) await startRec(w.name);
    if (w && cur === w.name && s.purified >= w.to) { await stopRec(); wins.shift(); if (!wins.length) break; }
    if (s.y === undefined || s.y < TAP_Y) { await sleep(20); continue; }
    const before = s.purified;
    await page.mouse.click(box.x + (box.w / 4) * (s.lane + 0.5), box.y + box.h / 2);
    try { await page.waitForFunction((b) => window.__stats().purified > b || window.__stats().over, { polling: "raf", timeout: 3000 }, before); } catch (e) { errors.push("tap: " + e.message); break; }
  }
  if (cur) await stopRec();
  const audio = await page.evaluate(async () => {
    if (window.__mediaRecorder && window.__mediaRecorder.state !== "inactive") await new Promise((r) => { window.__mediaRecorder.addEventListener("stop", r, { once: true }); window.__mediaRecorder.stop(); });
    const blob = new Blob(window.__audioBlobs || [], { type: "audio/webm" }); const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; const c = 0x8000; for (let i = 0; i < bytes.length; i += c) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + c));
    return { b64: btoa(bin), startAt: window.__audioStartAt, bytes: bytes.length };
  });
  const fin = await page.evaluate(() => window.__stats());
  await browser.close(); srv.close();

  if (!frames.length) throw new Error("フレームが1枚も撮れなかった");
  const meta = { audioStartAt: audio.startAt, audioBytes: audio.bytes, windows: [], events, 浄めた枚数: fin.purified, errors };
  for (const w of WINDOWS) {
    const fr = frames.filter((f) => f.win === w.name); if (!fr.length) continue;
    const dir = path.join(OUT, w.name); fs.mkdirSync(dir, { recursive: true });
    let list = "";
    fr.forEach((f, i) => { const n = `f${String(i).padStart(4, "0")}.jpg`; fs.writeFileSync(path.join(dir, n), Buffer.from(f.data, "base64")); const d = i < fr.length - 1 ? fr[i + 1].ts - f.ts : 1 / 15; list += `file '${n}'\nduration ${Math.max(d, 0.01).toFixed(4)}\n`; });
    list += `file 'f${String(fr.length - 1).padStart(4, "0")}.jpg'\n`;
    fs.writeFileSync(path.join(dir, "list.txt"), list);
    // 音の切り出しに使う: 窓の頭が「音の録り始め」から何秒後か
    meta.windows.push({ name: w.name, 枚数: fr.length, 秒: +(fr.at(-1).ts - fr[0].ts).toFixed(2), audioFrom: +(fr[0].ts - audio.startAt).toFixed(3) });
  }
  fs.writeFileSync(path.join(OUT, "audio.webm"), Buffer.from(audio.b64, "base64"));
  fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify({ 窓: meta.windows, 浄めた枚数: fin.purified, 音: audio.bytes + "B", 曲: events.filter((e) => e.ev === "song").map((e) => e.n + e.song), errors }, null, 0));
})();
