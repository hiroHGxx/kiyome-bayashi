/* 浄めばやし — 骨（kitan-scaffold）。「仮の遊び」は place()/draw() を差し替える。決めごとは残す。 */
(() => {
  "use strict";
  const W = 480, H = 720;                       // 論理寸法（canvas 内部）。実寸は main の箱に合わせて縮む
  const SLUG = "kiyome-bayashi";
  const SAVE_KEY = window.SAVE_KEY = SLUG + "_save";   // 記録は1キーの束（best/title/titleRank/sound）
  const RANK_BOARD = "main", SCORE_DIGIT = 100;        // 合成値 段×100+従の軸（上限がある作の型。青天井なら 1000）
  const MAX_FLOOR = 80;                                // 範囲外の値は丸めずに捨てる（丸めると最上位の誉れに化ける）
  const TITLES = [[0, "宵の口"], [8, "見習い"], [24, "手練れ"], [48, "棟梁"], [80, "満月成就"]];
  const titleFor = (f) => TITLES.reduce((t, [n, s]) => (f >= n ? s : t), TITLES[0][1]);
  const hash = location.hash;
  const autotest = hash.startsWith("#autotest"), autocut = hash.startsWith("#autocut"), noFloat = hash.includes("nofloat");
  const AUTO = autotest || autocut;             // 自動プレイは稽古ではなく本番ルールで動く＝送らない
  const $ = (id) => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d"), mainEl = document.querySelector("main");
  const titleOverlay = $("title-overlay"), overlay = $("overlay");

  /* ---- iOS: ダブルタップズームは 350ms 以内の2回目を止める（釦は除く）。gesturestart は等倍のときだけ止める ---- */
  let lastTouch = 0;
  document.addEventListener("touchend", (e) => { const t = Date.now(); if (t - lastTouch < 350 && !e.target.closest("button")) e.preventDefault(); lastTouch = t; }, { passive: false });
  document.addEventListener("gesturestart", (e) => { const vv = window.visualViewport; if (!vv || !(vv.scale > 1.01)) e.preventDefault(); }, { passive: false });

  /* ---- 拡縮: main の実寸から（padding-bottom の safe-area にも追従） ---- */
  function fitCanvas() { const b = mainEl.getBoundingClientRect(); const s = Math.min(b.width / W, b.height / H); canvas.style.width = Math.floor(W * s) + "px"; canvas.style.height = Math.floor(H * s) + "px"; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  new ResizeObserver(fitCanvas).observe(mainEl); fitCanvas();

  /* ---- 記録（わいわいSDK 主経路・localStorage は控え） ---- */
  const saveData = { best: 0, title: "", titleRank: -1, sound: "on" };
  const TIMED_OUT = {}; let saveUseSdk = false, saveDirty = false;
  function waiwaiTry(fn, label, ms = 2500) {
    let call; try { call = fn(); } catch (e) { console.warn("[waiwai] " + label + " を呼べなかった", e); return Promise.resolve({ ok: false }); }
    return Promise.race([Promise.resolve(call), new Promise((r) => setTimeout(() => r(TIMED_OUT), ms))]).then(
      (v) => (v === TIMED_OUT ? (console.warn("[waiwai] " + label + " が " + ms + "ms 以内に返らなかった"), { ok: false }) : { ok: true, value: v }),
      (e) => (console.warn("[waiwai] " + label + " が失敗した", e), { ok: false }));
  }
  function mergeSave(o) {   // 読み取れた「記録の」欄の数を返す（sound は好みなので数えない）
    if (!o || typeof o !== "object") return -1; let read = 0;
    const fl = (v) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= MAX_FLOOR ? Math.floor(v) : null);
    const b = fl(o.best); if (b !== null) { read++; saveData.best = Math.max(saveData.best, b); }
    const r = fl(o.titleRank); if (r !== null && typeof o.title === "string" && o.title) { read++; if (r > saveData.titleRank) { saveData.titleRank = r; saveData.title = o.title.slice(0, 40); } }
    if (o.sound === "on" || o.sound === "off") saveData.sound = o.sound; return read;
  }
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { return null; } };
  const writeLocal = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) {} };
  async function loadSave() {
    mergeSave(readLocal());
    if (window.waiwai) { const r = await waiwaiTry(() => window.waiwai.load(SAVE_KEY), "load"); if (r.ok) { saveUseSdk = true; mergeSave(r.value); } }   // ok:false の夜は SDK に書かない（空で潰さない）
  }
  function persistSave() { saveDirty = false; writeLocal(); if (saveUseSdk && window.waiwai) waiwaiTry(() => window.waiwai.save(SAVE_KEY, { ...saveData }), "save"); }
  document.addEventListener("visibilitychange", () => { if (document.hidden && saveDirty) persistSave(); });
  addEventListener("pagehide", () => { if (saveDirty) persistSave(); });

  /* ---- 状態 ---- */
  let started = false, over = false, practice = false, soundOn = true, floors = 0, streakTotal = 0, pausedUntil = 0, nightId = 0;
  let base = { x: 145, w: 190 }, slab = null;   // 仮の遊び: 横に往き来する帯を、台の上でとめる
  function newSlab() { const dir = Math.random() < 0.5 ? 1 : -1; slab = { x: dir === 1 ? -base.w - 40 : W + 40, w: base.w, dir, speed: Math.min(170 + floors * 4, 460), entered: false }; }
  const updateHud = () => { $("score").textContent = floors; $("best").textContent = Math.max(saveData.best, practice ? 0 : floors); };

  /* ---- 開幕の時間割: 絵だけ1.2秒 → カード0.7秒（ready のあとで押せる）。起点はページを開いた時刻。保険5秒 ---- */
  titleOverlay.classList.add("art-in");
  const t0 = performance.now(); let readyShown = false;
  const showCard = () => { if (readyShown) return; readyShown = true; titleOverlay.classList.add("ready"); if (saveData.title) { $("best-title").hidden = false; $("best-title").textContent = "これまでの誉れ：" + saveData.title; } updateHud(); };
  loadSave().then(() => setTimeout(showCard, Math.max(0, 1200 - (performance.now() - t0)))); setTimeout(showCard, 5000);
  if (autotest || autocut) loadSave().then(() => setTimeout(() => begin(false), 1400));

  /* ---- 稽古（題字を1.5秒以内に3回・pointerdown で数える） ---- */
  let taps = [];
  document.querySelector(".game-title").addEventListener("pointerdown", () => { const t = Date.now(); taps = taps.filter((x) => t - x < 1500); taps.push(t); if (taps.length >= 3 && !practice) { practice = true; const b = $("best-title"); b.hidden = false; b.textContent = "／ 稽古（記録は残らない）"; } });

  function begin(withSound) {
    soundOn = withSound; saveData.sound = withSound ? "on" : "off"; saveDirty = true; persistSave(); applySound();
    titleOverlay.classList.add("hidden"); started = true; nightId++;
    pausedUntil = performance.now() + 700;   // 開始タップの名残を受けない
    newSlab(); updateHud();
  }
  $("start").addEventListener("click", () => begin(true)); $("start-silent").addEventListener("click", () => begin(false));

  /* ---- 置く（仮の遊び）。札が台に届く前のタップは無かったことにする（式札 目付 k2s7 R-1） ---- */
  function place() {
    if (!started || over || !slab || performance.now() < pausedUntil || !slab.entered) return;
    const l = Math.max(base.x, slab.x), r = Math.min(base.x + base.w, slab.x + slab.w), ov = r - l;
    if (ov <= 4) { if (practice) return; over = true; showGameOver(); return; }
    if (Math.abs(slab.x - base.x) <= 7) { streakTotal++; addFloat("浄化 ×" + streakTotal); } else if (!practice) base = { x: l, w: ov };
    floors++; updateHud(); if (floors >= MAX_FLOOR) { over = true; showGameOver(true); return; } newSlab();
  }
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); place(); });
  const floats = []; function addFloat(t) { if (!noFloat) floats.push({ t, y: 300, life: 1 }); }

  /* ---- 夜の終わり ---- */
  const canSubmitScore = () => !practice && !AUTO && (floors > 0 || saveData.best > 0);   // 記録が無い人の0だけ送らない（宵あらわし式）
  function showGameOver(cleared) {
    $("final-rank").hidden = true; $("final-rank-mark").hidden = true; $("final-rank-line").hidden = true; $("final-rank-line").textContent = "";
    if (!practice) { if (floors > saveData.titleRank) { saveData.titleRank = floors; saveData.title = titleFor(floors); } saveData.best = Math.max(saveData.best, floors); saveDirty = true; persistSave(); }
    $("result-card").classList.toggle("clear", !!cleared); $("final-heading").textContent = cleared ? "満月成就" : "札は夜に呑まれた"; $("final-sub").textContent = cleared ? "喰われた月へ、道が架かった" : "重ねた道は、ここまで";
    $("final-title").textContent = titleFor(floors); $("final-score").innerHTML = floors + "<small>段</small>"; overlay.classList.add("show");
    if (canSubmitScore()) reportScore(floors * SCORE_DIGIT + Math.min(streakTotal, SCORE_DIGIT - 1), nightId);
  }
  window.__forceOver = () => { if (started && !over) { over = true; showGameOver(false); } };   // 検証用
  async function reportScore(score, myNight) {
    if (!window.waiwai) { console.warn("[waiwai] SDK が読めていないので全国順位は出さない"); return; }
    const res = await waiwaiTry(() => window.waiwai.submitScore(RANK_BOARD, score, { title: titleFor(floors) }), "submitScore"); if (!res.ok || nightId !== myNight) return;
    const v = res.value || {}; if (v.local) return;   // 枠の外は順位を出さない
    const rank = Number.isInteger(v.rank) ? v.rank : null; if (rank === null) return;
    const top = await waiwaiTry(() => window.waiwai.getTopScores(RANK_BOARD, 10), "getTopScores"); if (nightId !== myNight) return;
    const entries = top.ok && Array.isArray(top.value?.entries) ? top.value.entries : null, total = top.ok && Number.isInteger(top.value?.total) ? top.value.total : null;
    $("final-rank").hidden = false; $("final-rank-mark").hidden = v.improved !== true;
    const line = $("final-rank-line"); const holder = document.createElement(entries ? "button" : "span");
    if (entries) { holder.type = "button"; holder.className = "rank-open"; holder.addEventListener("click", () => openBanzuke(entries, total, rank, v.best ?? score)); }
    holder.textContent = "全国 " + rank + " 位" + (total !== null && total >= rank ? " ／ " + total + "人中" : "") + (entries ? " ›" : ""); line.appendChild(holder); line.hidden = false;
  }
  function openBanzuke(entries, total, myRank, myScore) {
    const list = $("bz-list"), me = $("bz-me"); list.textContent = ""; me.textContent = "";
    const row = (rank, name, score, mine) => { const li = document.createElement("li"); li.className = "bz-row" + (mine ? " me" : ""); const a = document.createElement("span"); a.className = "bz-rank"; a.textContent = rank; const b = document.createElement("span"); b.className = "bz-name"; b.textContent = String(name || "ナナシ").slice(0, 20); const c = document.createElement("span"); c.className = "bz-score"; c.textContent = Math.floor(score / SCORE_DIGIT) + "段（" + (score % SCORE_DIGIT) + "）"; li.append(a, b, c); return li; };
    let inList = false; for (const e of entries) { if (e.rank === myRank) inList = true; list.appendChild(row(e.rank, e.name, e.score, e.rank === myRank)); }
    $("bz-gap").hidden = inList; me.hidden = inList; if (!inList) me.appendChild(row(myRank, "あなた", myScore, true));
    $("bz-sub").hidden = !(total !== null && total >= myRank); $("bz-sub").textContent = total !== null ? "全国 " + total + "人" : ""; $("banzuke").classList.add("show");
  }
  $("bz-close").addEventListener("click", () => $("banzuke").classList.remove("show")); $("banzuke").addEventListener("click", (e) => { if (e.target === $("banzuke")) $("banzuke").classList.remove("show"); });
  function restart() { overlay.classList.remove("show"); $("banzuke").classList.remove("show"); over = false; floors = 0; streakTotal = 0; base = { x: 145, w: 190 }; nightId++; pausedUntil = performance.now() + 700; newSlab(); updateHud(); }
  $("retry").addEventListener("click", restart);

  /* ---- 音（骨では鳴らさない。MEDIA.md の作法で足す。ミュートは再生中の台詞も止めること） ---- */
  function applySound() { $("mute").classList.toggle("off", !soundOn); }
  $("mute").addEventListener("click", () => { soundOn = !soundOn; saveData.sound = soundOn ? "on" : "off"; saveDirty = true; persistSave(); applySound(); });

  /* ---- ループ ---- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (started && !over && slab && now >= pausedUntil) {
      slab.x += slab.dir * slab.speed * dt; if (slab.dir === 1 && slab.x > W + 40) slab.dir = -1; if (slab.dir === -1 && slab.x < -slab.w - 40) slab.dir = 1;
      if (!slab.entered && Math.min(base.x + base.w, slab.x + slab.w) - Math.max(base.x, slab.x) > 4) slab.entered = true;
      if (autotest && Math.abs(slab.x - base.x) < 5) place(); if (autocut && Math.abs(slab.x - base.x - 40) < 5) place();
    }
    draw(); requestAnimationFrame(frame);
  }
  function draw() {
    ctx.fillStyle = "#131320"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1B1B2E"; ctx.fillRect(0, 560, W, 160);                     // 台の地
    ctx.fillStyle = "#4a4468"; ctx.fillRect(base.x, 520, base.w, 40);            // 台
    if (slab) { ctx.fillStyle = "#D9A94C"; ctx.fillRect(slab.x, 470, slab.w, 40); }
    ctx.fillStyle = "#9D93B5"; ctx.font = "500 16px 'Shippori Mincho B1', serif"; ctx.textAlign = "center"; ctx.fillText(started ? floors + " 段" : "", W / 2, 60);   // canvas の文字は実寸12px以上（16px×0.78）
    for (const f of floats) { f.y -= 40 / 60; f.life -= 1 / 60; ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = "#F0CE7E"; ctx.font = "800 22px 'Shippori Mincho B1', serif"; ctx.fillText(f.t, W / 2, f.y); ctx.globalAlpha = 1; }
    for (let i = floats.length - 1; i >= 0; i--) if (floats[i].life <= 0) floats.splice(i, 1);
  }
  requestAnimationFrame(frame);
})();
