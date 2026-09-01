/* 浄めばやし — 落下タイル（SPEC §2・§3 が正本）。四筋を落ちる「闇の札」だけを、下から順に叩いて浄める。 */
(() => {
  "use strict";
  const W = 480, H = 720;                       // 論理寸法（canvas 内部）。実寸は main の箱に合わせて縮む
  const LANES = 4, LANE_W = 120, ROW_H = 180;   // 縦四筋・筋幅120・行高180（札絵 1024×1536＝2:3 が切り取りも余白もなく収まる）
  const MISS_Y = H - ROW_H;                     // 未浄の行がここを越えたら取りこぼし（＝札が下端から出はじめる前に叩く）
  const MANGAN = 108;                           // 百八枚で満願。その先は延長（枚数は青天井）
  const V0 = 145, ACC = 1.006, VMAX = 520;      // 初速 / 1枚ごとの倍率 / 上限（SPEC §3 の表）
  const ASSIST_ROWS = 3, ASSIST = 0.7;          // 助走: 最初の3行だけ V0×0.7
  const SLUG = "kiyome-bayashi";
  const SAVE_KEY = window.SAVE_KEY = SLUG + "_save";   // 記録は1キーの束（best/title/titleRank/sound）
  const RANK_BOARD = "main_v1";                 // 合成値＝浄めた枚数そのもの（SPEC §7-a・桁の細工はしない）
  const MAX_KEEP = 99999;                        // 束から読む枚数の上限。範囲外は丸めずに捨てる
  const TITLES = [[0, "宵の口"], [12, "拍取り"], [36, "囃子方"], [72, "音頭取り"], [108, "満願"]];
  const titleFor = (n) => TITLES.reduce((t, [k, s]) => (n >= k ? s : t), TITLES[0][1]);
  const hash = location.hash;
  const autotest = hash.startsWith("#autotest"), autocut = hash.startsWith("#autocut"), noFloat = hash.includes("nofloat");
  const AUTO = autotest || autocut;             // 自動プレイは稽古ではなく本番ルールで動く＝送らない
  const AUTO_TARGET = Math.max(1, parseInt((hash.match(/#autotest=(\d+)/) || [])[1], 10) || MANGAN);  // #autotest=260 で延長まで通す
  const $ = (id) => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d"), mainEl = document.querySelector("main");
  const titleOverlay = $("title-overlay"), overlay = $("overlay");

  /* ---- 札絵（29柱 × 段03・段10 ＝ 58枚）。build-dist が base64 に差し替えるので、道は必ず文字列で置く ---- */
  const SPIRITS = [
    { id: "anne", name: "餡音" }, { id: "atoza", name: "アトザ" }, { id: "aun", name: "アウン" },
    { id: "benten", name: "弁天" }, { id: "dan", name: "断" }, { id: "emma", name: "エマ" },
    { id: "hinanojo", name: "雛之丞" }, { id: "izuna", name: "イズナ" }, { id: "janome", name: "蛇ノ目" },
    { id: "karma", name: "カルマ" }, { id: "karura", name: "カルラ" }, { id: "kohaku", name: "狐白" },
    { id: "magoichi", name: "孫市" }, { id: "naruka", name: "ナルカ" }, { id: "nekomata", name: "猫又" },
    { id: "nemu", name: "ネム" }, { id: "oen", name: "おえん" }, { id: "orochi", name: "オロチ" },
    { id: "oto", name: "於兎" }, { id: "rotton", name: "呂屯" }, { id: "sakuya", name: "咲耶" },
    { id: "shiba", name: "柴" }, { id: "shinra", name: "シンラ" }, { id: "shion", name: "紫苑" },
    { id: "tart", name: "タルト" }, { id: "torika", name: "酉花" }, { id: "uka", name: "宇迦" },
    { id: "xiaolan", name: "シャオラン" }, { id: "yui", name: "結" },
  ];
  const FUDA = {
    anne_03: "assets/art/fuda/anne_03.webp", anne_10: "assets/art/fuda/anne_10.webp",
    atoza_03: "assets/art/fuda/atoza_03.webp", atoza_10: "assets/art/fuda/atoza_10.webp",
    aun_03: "assets/art/fuda/aun_03.webp", aun_10: "assets/art/fuda/aun_10.webp",
    benten_03: "assets/art/fuda/benten_03.webp", benten_10: "assets/art/fuda/benten_10.webp",
    dan_03: "assets/art/fuda/dan_03.webp", dan_10: "assets/art/fuda/dan_10.webp",
    emma_03: "assets/art/fuda/emma_03.webp", emma_10: "assets/art/fuda/emma_10.webp",
    hinanojo_03: "assets/art/fuda/hinanojo_03.webp", hinanojo_10: "assets/art/fuda/hinanojo_10.webp",
    izuna_03: "assets/art/fuda/izuna_03.webp", izuna_10: "assets/art/fuda/izuna_10.webp",
    janome_03: "assets/art/fuda/janome_03.webp", janome_10: "assets/art/fuda/janome_10.webp",
    karma_03: "assets/art/fuda/karma_03.webp", karma_10: "assets/art/fuda/karma_10.webp",
    karura_03: "assets/art/fuda/karura_03.webp", karura_10: "assets/art/fuda/karura_10.webp",
    kohaku_03: "assets/art/fuda/kohaku_03.webp", kohaku_10: "assets/art/fuda/kohaku_10.webp",
    magoichi_03: "assets/art/fuda/magoichi_03.webp", magoichi_10: "assets/art/fuda/magoichi_10.webp",
    naruka_03: "assets/art/fuda/naruka_03.webp", naruka_10: "assets/art/fuda/naruka_10.webp",
    nekomata_03: "assets/art/fuda/nekomata_03.webp", nekomata_10: "assets/art/fuda/nekomata_10.webp",
    nemu_03: "assets/art/fuda/nemu_03.webp", nemu_10: "assets/art/fuda/nemu_10.webp",
    oen_03: "assets/art/fuda/oen_03.webp", oen_10: "assets/art/fuda/oen_10.webp",
    orochi_03: "assets/art/fuda/orochi_03.webp", orochi_10: "assets/art/fuda/orochi_10.webp",
    oto_03: "assets/art/fuda/oto_03.webp", oto_10: "assets/art/fuda/oto_10.webp",
    rotton_03: "assets/art/fuda/rotton_03.webp", rotton_10: "assets/art/fuda/rotton_10.webp",
    sakuya_03: "assets/art/fuda/sakuya_03.webp", sakuya_10: "assets/art/fuda/sakuya_10.webp",
    shiba_03: "assets/art/fuda/shiba_03.webp", shiba_10: "assets/art/fuda/shiba_10.webp",
    shinra_03: "assets/art/fuda/shinra_03.webp", shinra_10: "assets/art/fuda/shinra_10.webp",
    shion_03: "assets/art/fuda/shion_03.webp", shion_10: "assets/art/fuda/shion_10.webp",
    tart_03: "assets/art/fuda/tart_03.webp", tart_10: "assets/art/fuda/tart_10.webp",
    torika_03: "assets/art/fuda/torika_03.webp", torika_10: "assets/art/fuda/torika_10.webp",
    uka_03: "assets/art/fuda/uka_03.webp", uka_10: "assets/art/fuda/uka_10.webp",
    xiaolan_03: "assets/art/fuda/xiaolan_03.webp", xiaolan_10: "assets/art/fuda/xiaolan_10.webp",
    yui_03: "assets/art/fuda/yui_03.webp", yui_10: "assets/art/fuda/yui_10.webp",  };
  const IMG = {};
  function fudaImg(id, st) { const k = id + "_" + st; let im = IMG[k]; if (!im) { im = IMG[k] = new Image(); im.src = FUDA[k]; } return im; }
  for (const s of SPIRITS) { fudaImg(s.id, "03"); fudaImg(s.id, "10"); }   // 先に取りにいく（描画は待たない）

  /* ---- iOS: ダブルタップズームは 350ms 以内の2回目を止める（釦は除く）。gesturestart は等倍のときだけ止める ---- */
  let lastTouch = 0;
  document.addEventListener("touchend", (e) => { const t = Date.now(); if (t - lastTouch < 350 && !e.target.closest("button")) e.preventDefault(); lastTouch = t; }, { passive: false });
  document.addEventListener("gesturestart", (e) => { const vv = window.visualViewport; if (!vv || !(vv.scale > 1.01)) e.preventDefault(); }, { passive: false });

  /* ---- 拡縮: main の実寸から（padding-bottom の safe-area にも追従） ---- */
  function fitCanvas() { const b = mainEl.getBoundingClientRect(); const s = Math.min(b.width / W, b.height / H); canvas.style.width = Math.floor(W * s) + "px"; canvas.style.height = Math.floor(H * s) + "px"; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  new ResizeObserver(fitCanvas).observe(mainEl); fitCanvas();

  /* ---- 記録（わいわいSDK 主経路・localStorage は控え） ---- */
  // clears＝満願の回数 / spirits＝柱ごとの浄めた数（29柱の図鑑の元。SPEC §7）
  const saveData = { best: 0, title: "", titleRank: -1, sound: "on", clears: 0, spirits: {} };
  const TIMED_OUT = {}; let saveUseSdk = false, saveDirty = false;
  function waiwaiTry(fn, label, ms = 2500) {
    let call; try { call = fn(); } catch (e) { console.warn("[waiwai] " + label + " を呼べなかった", e); return Promise.resolve({ ok: false }); }
    return Promise.race([Promise.resolve(call), new Promise((r) => setTimeout(() => r(TIMED_OUT), ms))]).then(
      (v) => (v === TIMED_OUT ? (console.warn("[waiwai] " + label + " が " + ms + "ms 以内に返らなかった"), { ok: false }) : { ok: true, value: v }),
      (e) => (console.warn("[waiwai] " + label + " が失敗した", e), { ok: false }));
  }
  function mergeSave(o) {   // 読み取れた「記録の」欄の数を返す（sound は好みなので数えない）
    if (!o || typeof o !== "object") return -1; let read = 0;
    const fl = (v) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= MAX_KEEP ? Math.floor(v) : null);
    const b = fl(o.best); if (b !== null) { read++; saveData.best = Math.max(saveData.best, b); }
    const r = fl(o.titleRank); if (r !== null && typeof o.title === "string" && o.title) { read++; if (r > saveData.titleRank) { saveData.titleRank = r; saveData.title = o.title.slice(0, 40); } }
    const c = fl(o.clears); if (c !== null) { read++; saveData.clears = Math.max(saveData.clears, c); }
    // spirits は「知っている29柱の欄」だけを読む（見知らぬ鍵は捨てる＝壊れた束で図鑑を膨らませない）。値は best と同じ物差しで捨てる
    if (o.spirits && typeof o.spirits === "object" && !Array.isArray(o.spirits)) {
      let got = 0;
      for (const s of SPIRITS) { const v = fl(o.spirits[s.id]); if (v !== null && v > 0) { got++; saveData.spirits[s.id] = Math.max(saveData.spirits[s.id] || 0, v); } }
      if (got) read++;
    }
    if (o.sound === "on" || o.sound === "off") saveData.sound = o.sound; return read;
  }
  const readLocal = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) { return null; } };
  const writeLocal = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); } catch (e) {} };
  async function loadSave() {
    mergeSave(readLocal());
    if (window.waiwai) { const r = await waiwaiTry(() => window.waiwai.load(SAVE_KEY), "load"); if (r.ok) { saveUseSdk = true; mergeSave(r.value); } }   // ok:false の夜は SDK に書かない（空で潰さない）
  }
  // spirits は入れ子なので写しを渡す（浅い写しだと、向こうが握ったまま次の夜の加算が混ざる）
  function persistSave() { saveDirty = false; writeLocal(); if (saveUseSdk && window.waiwai) waiwaiTry(() => window.waiwai.save(SAVE_KEY, { ...saveData, spirits: { ...saveData.spirits } }), "save"); }
  document.addEventListener("visibilitychange", () => { if (document.hidden && saveDirty) persistSave(); });
  addEventListener("pagehide", () => { if (saveDirty) persistSave(); });

  /* ---- 状態 ---- */
  let started = false, over = false, practice = false, soundOn = true, pausedUntil = 0, nightId = 0;
  let purified = 0;                 // この夜に浄めた枚数（＝そのまま点）
  let rows = [];                    // 下から上へ。rows[0] が最下段
  let darkPool = [], litIds = [], litSet = null;   // 闇に出す柱の残り／すでに浄めた柱（色の札はここから）
  let lastDark = [-1, -1], lastAdj = false;
  const rings = [], floats = [];
  const runTally = new Map();       // この夜に柱ごとへ何枚浄めたか。夜の終わりに束へ足す（稽古は足さない）
  let runStart = 0, manganAt = 0;
  // 検証用の覗き口（読むだけ）。ids は「同じ柱が盤に二度出ていないか」を数える。
  // lane は最下段の未浄の筋＝機械に手で遊ばせて実写真を撮るため（自動プレイは番付の行が出ないので画が撮れない）
  window.__stats = () => ({ purified, pillars: litSet ? litSet.size : 0, manganAt, over, lane: (lowestUncleared() || {}).darkLane, ids: rows.flatMap((r) => [r.darkId, r.colorId]) });

  const shuffled = () => { const a = SPIRITS.map((s) => s.id); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  const liveIds = () => { const v = new Set(); for (const r of rows) { v.add(r.darkId); v.add(r.colorId); } return v; };
  function pickDark() {   // 一巡したら全部が闇に戻る（月が欠ける）。ただし盤に出ている柱は飛ばす
    if (!darkPool.length) darkPool = shuffled();
    const live = liveIds();
    let i = darkPool.findIndex((id) => !live.has(id));
    // 一巡の終わりぎわは、残りが全部 盤に出ていることがある。そこで次の一巡を前倒しで足す
    // （「29柱ちょうどで一巡」は遊ぶ側に見えない決めごと・SPEC §3。同じ柱が二枚出るのは見えてしまう）
    if (i < 0) { darkPool = darkPool.concat(shuffled()); i = darkPool.findIndex((id) => !live.has(id)); }
    return darkPool.splice(i < 0 ? 0 : i, 1)[0];
  }
  function pickColor(dark) {
    // 盤に出ている柱は避ける。避けないと、浄めた柱がまだ数柱しかない序盤に
    // 同じ極彩の札が画面に3枚並び、絵が壊れて見える（2026-09-01・実画面で確認）
    const live = liveIds(); live.add(dark);
    const all = SPIRITS.map((s) => s.id);
    // ① まず「すでに浄めた柱」から、盤に出ていないもの ② 足りなければ 29柱まで広げる（盤の重なりを優先して避ける）
    let from = litIds.filter((id) => !live.has(id));
    if (!from.length) from = all.filter((id) => !live.has(id));
    if (!from.length) from = all.filter((id) => id !== dark);
    return from[(Math.random() * from.length) | 0];
  }
  function pickLanes() {
    let cand = [0, 1, 2, 3];
    if (lastDark[0] >= 0 && lastDark[0] === lastDark[1]) cand = cand.filter((l) => l !== lastDark[0]);   // 同じ筋が3行続けて闇にならない
    const d = cand[(Math.random() * cand.length) | 0];
    let cc = [0, 1, 2, 3].filter((l) => l !== d);
    if (lastAdj) { const far = cc.filter((l) => Math.abs(l - d) >= 2); if (far.length) cc = far; }        // 闇と隣り合う行を続けない
    const c = cc[(Math.random() * cc.length) | 0];
    lastDark = [d, lastDark[0]]; lastAdj = Math.abs(c - d) === 1;
    return { d, c };
  }
  function spawnRow() {
    const y = rows.length ? rows[rows.length - 1].y - ROW_H : 0;
    const { d, c } = pickLanes(); const dark = pickDark();
    rows.push({ y, darkLane: d, colorLane: c, darkId: dark, colorId: pickColor(dark), cleared: false });
  }
  const lowestUncleared = () => { for (const r of rows) if (!r.cleared) return r; return null; };
  const speed = () => (practice ? V0 : purified < ASSIST_ROWS ? V0 * ASSIST : Math.min(V0 * Math.pow(ACC, purified), VMAX));   // 稽古は V0 に固定（SPEC §6）
  const updateHud = () => { $("score").textContent = purified; $("best").textContent = Math.max(saveData.best, practice ? 0 : purified); $("pillars").textContent = (litSet ? litSet.size : 0) + "/29"; };

  /* ---- 開幕の時間割: 絵だけ1.2秒 → カード0.7秒（ready のあとで押せる）。起点はページを開いた時刻。保険5秒 ---- */
  titleOverlay.classList.add("art-in");
  const t0 = performance.now(); let readyShown = false;
  const showCard = () => { if (readyShown) return; readyShown = true; titleOverlay.classList.add("ready"); if (saveData.title) { $("best-title").hidden = false; $("best-title").textContent = "これまでの誉れ：" + saveData.title; } updateHud(); };
  loadSave().then(() => setTimeout(showCard, Math.max(0, 1200 - (performance.now() - t0)))); setTimeout(showCard, 5000);
  if (AUTO) loadSave().then(() => setTimeout(() => begin(false), 1400));

  /* ---- 稽古（題字を1.5秒以内に3回・pointerdown で数える） ---- */
  let taps = [];
  document.querySelector(".game-title").addEventListener("pointerdown", () => { const t = Date.now(); taps = taps.filter((x) => t - x < 1500); taps.push(t); if (taps.length >= 3 && !practice) { practice = true; const b = $("best-title"); b.hidden = false; b.textContent = "／ 稽古（記録は残らない）"; } });

  function resetRun() {
    over = false; purified = 0; rows = []; darkPool = shuffled(); litIds = []; litSet = new Set();
    lastDark = [-1, -1]; lastAdj = false; rings.length = 0; floats.length = 0; manganAt = 0; runTally.clear(); kotoStep = 0;
    for (let i = 0; i < 3; i++) spawnRow();          // 上から3行ぶんが降りてくるところから始まる
    nightId++; pausedUntil = performance.now() + 700; runStart = performance.now(); updateHud();
  }
  function begin(withSound) {
    soundOn = withSound; saveData.sound = withSound ? "on" : "off"; saveDirty = true; persistSave(); applySound();
    titleOverlay.classList.add("hidden"); started = true; resetRun();
  }
  $("start").addEventListener("click", () => begin(true)); $("start-silent").addEventListener("click", () => begin(false));

  /* ---- 叩く。見るのは「どの筋か」だけ（指の高さは判定に使わない・SPEC §2） ---- */
  function strike(lane) {
    if (!started || over || performance.now() < pausedUntil) return;
    const r = lowestUncleared(); if (!r) return;
    if (lane !== r.darkLane) { over = true; showGameOver(false); return; }   // 色の札でも空の筋でも、外したら夜明け
    purify(r);
  }
  function purify(r) {
    r.cleared = true; purified++;
    kotoPluck();   // 浄めるたびに琴が次の音を鳴らす（SPEC §5）
    if (!litSet.has(r.darkId)) { litSet.add(r.darkId); litIds.push(r.darkId); }   // 浄めた柱は以後 色の札の側へ回る
    runTally.set(r.darkId, (runTally.get(r.darkId) || 0) + 1);
    rings.push({ cx: r.darkLane * LANE_W + LANE_W / 2, cy: r.y + ROW_H / 2, t: 0 });
    if (purified === MANGAN) { manganAt = performance.now() - runStart; addFloat("満　願"); playSe("end"); }
    else if (litSet.size === SPIRITS.length && purified < MANGAN) addFloat("満　天");
    updateHud();
  }
  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault(); const b = canvas.getBoundingClientRect(); if (!b.width) return;
    strike(Math.max(0, Math.min(LANES - 1, Math.floor(((e.clientX - b.left) / b.width) * LANES))));
  });
  function addFloat(t) { if (!noFloat) floats.push({ t, y: 300, life: 1 }); }

  /* ---- 夜の終わり ---- */
  const canSubmitScore = () => !practice && !AUTO && (purified > 0 || saveData.best > 0);   // 記録が無い人の0だけ送らない（宵あらわし式）
  function showGameOver(cleared) {
    playSe("whiff");   // 夜明け（色の札を叩いた／取りこぼした・SPEC §5）
    $("final-rank").hidden = true; $("final-rank-mark").hidden = true; $("final-rank-line").hidden = true; $("final-rank-line").textContent = "";
    const won = !!cleared || purified >= MANGAN;
    const prevBest = saveData.best;   // 束を書き換える前に控える（自己最高の更新は SDK が無い夜でも出す）
    // 束へ足すのは夜の終わりに1回だけ（稽古は残さない・SPEC §6）。満願は回数、柱は枚数で積む
    if (!practice) {
      if (purified > saveData.titleRank) { saveData.titleRank = purified; saveData.title = titleFor(purified); }
      saveData.best = Math.max(saveData.best, purified);
      if (won) saveData.clears = Math.min(MAX_KEEP, saveData.clears + 1);
      for (const [id, n] of runTally) saveData.spirits[id] = Math.min(MAX_KEEP, (saveData.spirits[id] || 0) + n);
      saveDirty = true; persistSave();
    }
    $("result-card").classList.toggle("clear", won); $("final-heading").textContent = won ? "明けの祓い" : "夜が明けた"; $("final-sub").textContent = won ? "百八の闇は、みな色を取り戻した" : "囃子は、ここで途切れた";
    $("final-title").textContent = titleFor(purified); $("final-score").innerHTML = purified + "<small>枚</small>";
    // 最高（自己）。稽古の夜は束を触っていないので、これまでの最高をそのまま出す
    const renewed = !practice && purified > prevBest;
    $("final-best").textContent = "最高 " + saveData.best + "枚" + (renewed ? "　更新" : "") + (practice ? "（稽古）" : "");
    $("final-best").classList.toggle("new", renewed);
    updateZukanEntry();   // 束へ足したあとの数（この夜に初めて浄めた柱もここで灯る）
    overlay.classList.add("show");
    if (canSubmitScore()) reportScore(purified, nightId);
  }
  window.__forceOver = () => { if (started && !over) { over = true; showGameOver(false); } };   // 検証用
  async function reportScore(score, myNight) {
    if (!window.waiwai) { console.warn("[waiwai] SDK が読めていないので全国順位は出さない"); return; }
    const res = await waiwaiTry(() => window.waiwai.submitScore(RANK_BOARD, score, { title: titleFor(purified) }), "submitScore"); if (!res.ok || nightId !== myNight) return;
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
    const row = (rank, name, score, mine) => { const li = document.createElement("li"); li.className = "bz-row" + (mine ? " me" : ""); const a = document.createElement("span"); a.className = "bz-rank"; a.textContent = rank; const b = document.createElement("span"); b.className = "bz-name"; b.textContent = String(name || "ナナシ").slice(0, 20); const c = document.createElement("span"); c.className = "bz-score"; c.textContent = score + "枚"; li.append(a, b, c); return li; };
    let inList = false; for (const e of entries) { if (e.rank === myRank) inList = true; list.appendChild(row(e.rank, e.name, e.score, e.rank === myRank)); }
    $("bz-gap").hidden = inList; me.hidden = inList; if (!inList) me.appendChild(row(myRank, "あなた", myScore, true));
    $("bz-sub").hidden = !(total !== null && total >= myRank); $("bz-sub").textContent = total !== null ? "全国 " + total + "人" : ""; $("banzuke").classList.add("show");
  }
  $("bz-close").addEventListener("click", () => $("banzuke").classList.remove("show")); $("banzuke").addEventListener("click", (e) => { if (e.target === $("banzuke")) $("banzuke").classList.remove("show"); });

  /* ---- 図鑑29柱（SPEC §1 meta 層）。浄めた柱が灯る＝二値。段位で育てるのは第一版に入れない（§12） ---- */
  const litCount = () => SPIRITS.reduce((n, s) => n + (saveData.spirits[s.id] > 0 ? 1 : 0), 0);
  let zkBuilt = false;
  function buildZukan() {
    if (zkBuilt) return; zkBuilt = true;
    const g = $("zk-grid");
    for (const s of SPIRITS) {
      const li = document.createElement("li"); li.className = "zk-cell"; li.dataset.id = s.id; li.dataset.name = s.name;
      const im = document.createElement("img"); im.alt = "";
      const nm = document.createElement("span"); nm.className = "zk-name"; nm.textContent = s.name;
      li.append(im, nm); g.appendChild(li);
    }
  }
  function paintZukan() {
    for (const li of $("zk-grid").children) {
      const id = li.dataset.id, lit = saveData.spirits[id] > 0, im = li.firstChild;
      li.classList.toggle("lit", lit);
      im.src = FUDA[id + "_" + (lit ? "10" : "03")];   // 道は FUDA の表から引く（組み立てた文字列は artifact で base64 に化けない）
      im.alt = li.dataset.name + (lit ? "・灯っている" : "・まだ闇の中");
    }
    const n = litCount();
    $("zk-sub").textContent = n >= SPIRITS.length ? "満　天 — 二十九柱すべてに灯がともった" : n + " ／ 29 柱";
  }
  function openZukan() { buildZukan(); paintZukan(); $("zukan").classList.add("show"); }
  const updateZukanEntry = () => { $("zukan-open").textContent = "図鑑 " + litCount() + "/29 ›"; };
  $("zukan-open").addEventListener("click", openZukan);
  $("zk-close").addEventListener("click", () => $("zukan").classList.remove("show")); $("zukan").addEventListener("click", (e) => { if (e.target === $("zukan")) $("zukan").classList.remove("show"); });
  function restart() { overlay.classList.remove("show"); $("banzuke").classList.remove("show"); $("zukan").classList.remove("show"); resetRun(); }
  $("retry").addEventListener("click", restart);

  /* ---- 音（琴・Karplus-Strong 弦合成。SPEC §5）----
     浄めるたびに次の音を鳴らす。音階は都節音階（陰旋法）＝宵闇の側。ヨナ抜き長音階は明るすぎるので使わない。
     上行して一巡（5音）したら次の高さへ——scaleFreq(step) は step が5増えるごとに1オクターブ上がるので、
     kotoStep をただ足すだけで実現できる。ただし932Hz（step 11）を超えたら1オクターブ折り返す
     （弦モデルは高音ほど N=sr/freq が細り、楽器らしさが崩れる）。合成は御霊おとしの弦の物理モデルを流用、
     宵あらわし §19.2 がサンプルをやめて同じ手（純合成・音源ファイル無し）にしたのに倣う。
     BGM・声・満願と夜明けの音・SE9本はこの便では扱わない（SPEC §5・次便へ）。 */
  const SFX_BUS = 0.9;      // 効果音バスの素の大きさ（式札かさね・宵あらわしと同値）
  let audioCtx = null, sfxBus = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        sfxBus = audioCtx.createGain();
        sfxBus.gain.value = SFX_BUS;
        sfxBus.connect(audioCtx.destination);
      } catch (e) { return null; }
    }
    if (audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
    return audioCtx;
  }
  const KOTO_RING_S = 2.4, KOTO_DECAY = 0.996, KOTO_TAU_S = 0.8;   // 一音の長さ・弦の減衰・包絡の時定数（宵あらわしと同値）
  function kotoWave(freq, sr) {   // 弦の波形を焼く（純関数。周波数から決まる擬似乱数＝毎回同じ波）
    const len = Math.round(sr * KOTO_RING_S);
    const d = new Float32Array(len);
    const N = Math.max(2, Math.round(sr / freq));
    let seed = (Math.round(freq) * 2654435761) >>> 0;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < N; i++) d[i] = rnd() * 2 - 1;
    for (let j = N; j < len; j++) d[j] = KOTO_DECAY * 0.5 * (d[j - N] + d[j - N + 1]);
    const tau = sr * KOTO_TAU_S, fade = Math.round(sr * 0.1);
    let peak = 0;
    for (let k = 0; k < len; k++) {
      let e = Math.exp(-k / tau);
      if (k > len - fade) e *= (len - k) / fade;
      d[k] *= e;
      if (Math.abs(d[k]) > peak) peak = Math.abs(d[k]);
    }
    if (peak > 0) for (let m = 0; m < len; m++) d[m] *= 0.9 / peak;
    return d;
  }
  const pluckCache = {};
  function pluckOut(freq, vol) {
    if (!soundOn) return;
    const a = getAudioCtx(); if (!a) return;
    try {
      const key = Math.round(freq);
      let buf = pluckCache[key];
      if (!buf) {
        const w = kotoWave(freq, a.sampleRate);
        buf = a.createBuffer(1, w.length, a.sampleRate);
        buf.getChannelData(0).set(w);
        pluckCache[key] = buf;
      }
      const src = a.createBufferSource(); src.buffer = buf;
      const g = a.createGain(); g.gain.value = vol;
      src.connect(g); g.connect(sfxBus || a.destination);
      src.start(a.currentTime);
    } catch (e) {}
  }
  const KOTO_WOB_VOL = 0.08, KOTO_WOB_HZ = 0.004;   // 連射の機械感を消す揺らぎ（音量±8%・ピッチ±0.4%）
  const SCALE = [0, 1, 5, 7, 8];                    // 陰旋法（都節音階）
  function scaleFreq(step) {
    const oct = Math.floor(step / SCALE.length);
    const semi = SCALE[step % SCALE.length] + oct * 12;
    return 220 * Math.pow(2, semi / 12);   // 220Hz（A3）起点＝常に200Hz超（モバイルの床。MEDIA.md）
  }
  function noteFreq(step) {
    while (step > 11) step -= SCALE.length;   // 932Hz（step 11）を上限に1オクターブ（5音）ずつ折り返す
    return scaleFreq(step);
  }
  let kotoStep = 0;   // 浄めた回数そのもの。夜ごとに resetRun() でリセット
  function kotoPluck() {
    const freq = noteFreq(kotoStep) * (1 + (Math.random() * 2 - 1) * KOTO_WOB_HZ);
    const vol = 0.7 * (1 + (Math.random() * 2 - 1) * KOTO_WOB_VOL);
    pluckOut(freq, vol);
    kotoStep++;
  }
  window.__koto = { scaleFreq, noteFreq, kotoWave, SCALE, KOTO_RING_S, get kotoStep() { return kotoStep; }, get ctxState() { return audioCtx ? audioCtx.state : null; } };   // 検証用

  /* ---- 夜明け・満願の音（公式ミニゲームSE。琴と地続きの低音寄りの2本を選定・SPEC §5）----
     どちらも200Hz未満に音圧の大半が集まる低音寄りの音（end: <400Hzが全体とほぼ同値、whiff: 同様）＝
     Karplus-Strong弦の琴と質感が割れない。whiff は既存作でも一貫して「外した／誤タップ」の役なので、
     色の札を叩く／取りこぼす＝夜明けの意味に素直。end は在庫中もっとも長く（1.76秒）低く、
     満願（108枚）の締めに使う。
     音量は「浄めの音（琴）が主役・夜明けと満願がその次」（依頼指定）。実測（Chromeのデコード後、
     0.1秒窓RMSの最大値＝鳴った瞬間。sfxBus 0.9 込み）:
       琴（一夜の平均）  -18.1dB（開始12音）／ -19.1dB（以後108枚のほとんどを占める反復5音）
       whiff（夜明け）  SE_VOL=0.7 で -21.5dB／end（満願）  SE_VOL=0.4 で -20.2dB
     どちらも琴の平均より2.6〜3.6dB下＝主役を食わない。ファイルは持たず assets/audio/ の2本
     （whiff・end）のみ同梱。fetch は index.html（Pages）用の経路で、
     dist/artifact.html は build-dist.js が window.AUDIO_DATA に base64 を注ぐ
     （Artifact の CSP は fetch("data:") を通さない――他作の教訓。atob() 経由で読む）。 */
  const SE_NAMES = ["whiff", "end"];   // build-dist.js もこの名前をそのまま読む（二重管理しない）
  const SE_VOL = { whiff: 0.7, end: 0.4 };
  const seBuf = {}, sePromise = {};
  function b64ToBuf(b64) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8.buffer;
  }
  function loadSe(name) {
    if (sePromise[name]) return sePromise[name];
    const a = getAudioCtx(); if (!a) return Promise.resolve(null);
    sePromise[name] = new Promise((resolve) => {
      const keep = (buf) => { seBuf[name] = buf; resolve(buf); };
      const miss = () => resolve(null);
      if (window.AUDIO_DATA && window.AUDIO_DATA[name]) { try { a.decodeAudioData(b64ToBuf(window.AUDIO_DATA[name]), keep, miss); } catch (e) { miss(); } return; }
      fetch("assets/audio/" + name + ".m4a").then((r) => { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then((ab) => a.decodeAudioData(ab, keep, miss)).catch(miss);
    });
    return sePromise[name];
  }
  const seCounts = { whiff: 0, end: 0 };   // 検証用（実プレイで狙った箇所から呼ばれたかを数える）
  function playSe(name) {
    if (!soundOn) return;
    seCounts[name] = (seCounts[name] || 0) + 1;
    const a = getAudioCtx(); if (!a) return;
    const play = (buf) => {
      if (!buf || !soundOn) return;
      try {
        const src = a.createBufferSource(); src.buffer = buf;
        const g = a.createGain(); g.gain.value = SE_VOL[name];
        src.connect(g); g.connect(sfxBus || a.destination);
        src.start(a.currentTime);
      } catch (e) {}
    };
    if (seBuf[name]) play(seBuf[name]); else loadSe(name).then(play);
  }
  window.__se = { SE_NAMES, SE_VOL, playSe, get loaded() { return SE_NAMES.every((n) => !!seBuf[n]); }, get counts() { return { ...seCounts }; } };   // 検証用
  function applySound() { $("mute").classList.toggle("off", !soundOn); }
  $("mute").addEventListener("click", () => { soundOn = !soundOn; saveData.sound = soundOn ? "on" : "off"; saveDirty = true; persistSave(); applySound(); });

  /* ---- ループ ---- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (started && !over && now >= pausedUntil) {
      const v = speed();
      for (const r of rows) r.y += v * dt;
      const low = lowestUncleared();
      if (low && low.y > MISS_Y) { over = true; showGameOver(false); }   // 取りこぼし
      else {
        while (rows.length && rows[0].y >= H) rows.shift();
        while (!rows.length || rows[rows.length - 1].y > -ROW_H) spawnRow();
        if (AUTO) {
          const r = lowestUncleared();
          if (r) { if (autocut) { if (purified >= 3) strike(r.colorLane); else strike(r.darkLane); } else if (purified < AUTO_TARGET) strike(r.darkLane); }
        }
      }
    }
    draw(dt); requestAnimationFrame(frame);
  }
  /* ---- 描く ---- */
  function drawCard(lane, y, id, st, mark) {
    const x = lane * LANE_W, im = fudaImg(id, st);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, x, y, LANE_W, ROW_H);
    else { ctx.fillStyle = "#1B1B2E"; ctx.fillRect(x, y, LANE_W, ROW_H); }
    // 闇の札には金の枠（SPEC §2）。地の暗い柱は枠が無いと札ではなく穴に見える。
    // 細枠（2px・不透明度.55）では実機寸法で見えなかったので太らせた（2026-09-02・実写真で確認）。
    // 金泥は内側に暗い線を添える＝明るい絵の柱でも枠の縁が溶けない。色は design-tokens.json から。
    if (mark) {
      ctx.strokeStyle = "#D9A94C"; ctx.lineWidth = 6; ctx.strokeRect(x + 3, y + 3, LANE_W - 6, ROW_H - 6);
      ctx.strokeStyle = "#131320"; ctx.lineWidth = 2; ctx.strokeRect(x + 7, y + 7, LANE_W - 14, ROW_H - 14);
    }
  }
  function draw(dt) {
    ctx.fillStyle = "#131320"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1B1B2E"; for (let i = 1; i < LANES; i++) ctx.fillRect(i * LANE_W - 0.5, 0, 1, H);   // 筋の境
    for (const r of rows) {
      if (r.y > H || r.y < -ROW_H) continue;
      drawCard(r.colorLane, r.y, r.colorId, "10", false);
      drawCard(r.darkLane, r.y, r.darkId, r.cleared ? "10" : "03", !r.cleared);
    }
    // 金の輪（札の外へ広がって消える。札の子要素に置かない＝切り抜きに切られない）
    for (let i = rings.length - 1; i >= 0; i--) {
      const g = rings[i]; g.t += dt * 2.4; if (g.t >= 1) { rings.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - g.t; ctx.strokeStyle = "#F0CE7E"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, 26 + g.t * 130, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.textAlign = "center";
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i]; f.y -= dt * 40; f.life -= dt; if (f.life <= 0) { floats.splice(i, 1); continue; }
      // 極彩色の札の上に乗るので、宵闇の縁取りを先に敷く（単色だと段10の絵に沈む・SPEC §4）
      ctx.globalAlpha = Math.max(0, f.life); ctx.font = "800 34px 'Shippori Mincho B1', serif";
      ctx.lineJoin = "round"; ctx.strokeStyle = "#131320"; ctx.lineWidth = 8; ctx.strokeText(f.t, W / 2, f.y);
      ctx.fillStyle = "#F0CE7E"; ctx.fillText(f.t, W / 2, f.y); ctx.globalAlpha = 1;
    }
  }
  requestAnimationFrame(frame);
})();
