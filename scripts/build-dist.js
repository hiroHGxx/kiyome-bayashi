// src/page.html ＋ src/*.js → index.html（Pages 用・JS 全インライン・SDK 1行だけ外部）と
// dist/artifact.html（Claude Artifact 用・assets を base64 で同梱・charset を先頭に戻す）。RELEASE.md §1。
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), src = fs.readFileSync(path.join(root, "src", "page.html"), "utf8");
const SDK_TAG = '<script src="https://waiwai.town/sdk.js" crossorigin="anonymous"></script>';
const die = (m) => { console.error("[build-dist] " + m); process.exit(1); };
const inlined = src.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, p) => "<script>\n" + fs.readFileSync(path.join(root, p), "utf8") + "\n</script>");
function assertOk(html, label) {
  if (!html.includes(SDK_TAG)) die(`[${label}] わいわいSDK の1行が消えている`);
  if (html.split(SDK_TAG).join("").includes("<script src=")) die(`[${label}] インライン化できていない script が残っている`);
  if (/X-Frame-Options/i.test(html)) die(`[${label}] X-Frame-Options が入っている（iframe掲載が壊れる）`);
}
assertOk(inlined, "index"); fs.writeFileSync(path.join(root, "index.html"), inlined);
const MIME = { m4a: "audio/mp4", wav: "audio/wav", mp3: "audio/mpeg", webp: "image/webp", png: "image/png", jpg: "image/jpeg" };
// 効果音（whiff・end）は data:URI 化しない——Artifact の CSP は fetch("data:") を通さない（他作の教訓・src/game.js 側の註）。
// game.js の SE_NAMES をそのまま読み、window.AUDIO_DATA に base64 を注いで atob() 経由で読ませる。
const gameSrc = fs.readFileSync(path.join(root, "src", "game.js"), "utf8");
const seNamesM = gameSrc.match(/const SE_NAMES = \[([^\]]*)\]/);
if (!seNamesM) die("src/game.js の SE_NAMES が読み取れない（音の正本の書き方が変わった？）");
const seNames = seNamesM[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
const audioData = {};
for (const n of seNames) {
  const f = path.join(root, "assets", "audio", n + ".m4a");
  if (!fs.existsSync(f)) die(`効果音が見つからない: assets/audio/${n}.m4a`);
  audioData[n] = fs.readFileSync(f).toString("base64");
}
const audioTag = "<script>window.AUDIO_DATA = " + JSON.stringify(audioData) + ";</script>\n";
let art = inlined.replace(/assets\/(?:art|fuda)\/(?:[\w.-]+\/)*[\w.-]+\.(webp|png|jpg)/g, (ref, ext) => {
  const f = path.join(root, ref); if (!fs.existsSync(f)) return ref;
  return "data:" + MIME[ext] + ";base64," + fs.readFileSync(f).toString("base64");
});
art = art.replace("<body>", "<body>\n" + audioTag);
const title = (art.match(/<title>([\s\S]*?)<\/title>/) || [, "浄めばやし"])[1];
const head = art.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>\s*/g, "").replace(/<title>[\s\S]*?<\/title>\s*/, "");
const body = art.match(/<body>([\s\S]*)<\/body>/)[1];
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
// charset は head から剥がしたので必ず先頭へ戻す（無いと IBM866 と誤推測されて全文字化け・SHITSURAE §8）
const out = '<meta charset="utf-8">\n<title>' + title + "</title>\n" + head + body;
if (out.length > 16 * 1024 * 1024) die("artifact.html が 16MB を超えた（" + (out.length / 1048576).toFixed(2) + "MB）。素材を絞る");
fs.writeFileSync(path.join(root, "dist", "artifact.html"), out);
console.log("index.html:", fs.statSync(path.join(root, "index.html")).size, "/ dist/artifact.html:", out.length);
