#!/usr/bin/env node
// QQ 机器人一键控制面板（本地网页）—— 双击 E:\dsh_chatting_bot\启动QQ机器人.bat 启动
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const ROOT = "E:\\dsh_chatting_bot";
const SNOWLUMA_APP = path.join(ROOT, "SnowLuma", "app");
const SNOWLUMA_NODE = path.join(SNOWLUMA_APP, "node.exe");
const SNOWLUMA_PW = process.env.SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD || "change-me";
const BRIDGE = path.join(ROOT, "qqbot", "qq-bridge");
const PANEL_DIR = path.join(ROOT, "qqbot", "panel");
const RUN_DIR = path.join(PANEL_DIR, "run");
const LOG_DIR = path.join(PANEL_DIR, "logs");
const PANEL_PORT = 3200;
const SL_PORT = 5099, BR_PORT = 3100;
const EXPECTED_BOT_UIN = "3949453849"; // 机器人小号；PC 上登录的必须是它

fs.mkdirSync(RUN_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

const procs = {};
const recent = { snowluma: [], bridge: [] };

function logTail(name, chunk) {
  const lines = String(chunk).split(/\r?\n/).filter(Boolean);
  for (const l of lines) recent[name].push(l);
  if (recent[name].length > 300) recent[name].splice(0, recent[name].length - 300);
}

function portAlive(port, timeout = 600) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const finish = (v) => { if (done) return; done = true; s.destroy(); resolve(v); };
    s.setTimeout(timeout);
    s.once("connect", () => finish(true));
    s.once("timeout", () => finish(false));
    s.once("error", () => finish(false));
    s.connect(port, "127.0.0.1");
  });
}

let dshCache = { url: "", at: 0 };

function listeningPorts() {
  try {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true });
    const set = new Set();
    for (const line of String(r.stdout || "").split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const m = line.match(/127\.0\.0\.1:(\d+)\s/);
      if (m) set.add(Number(m[1]));
    }
    return [...set];
  } catch { return []; }
}

function probeDshPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 600 }, (res) => {
      let b = ""; res.on("data", (c) => b += c);
      res.on("end", () => resolve(b.includes("dsh web authentication required")));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

// DSH 每次重启端口都会变，所以不能写死：扫本机监听端口，用 DSH 的 401 文案认它
async function discoverDsh() {
  if (dshCache.url && Date.now() - dshCache.at < 15000) return dshCache.url;
  let ports = listeningPorts().filter((p) => p !== SL_PORT && p !== BR_PORT && p !== PANEL_PORT);
  if (!ports.length) {
    // netstat 拿不到时（权限/被拦截）退化为探测几个常见端口 + 配置里记着的那个
    const cfgPort = (() => {
      try { return Number(new URL(readJson(path.join(BRIDGE, "config.json"), {})?.dsh?.baseUrl || "").port) || 0; } catch { return 0; }
    })();
    ports = [...new Set([cfgPort, 3080, 14476, 4477].filter((p) => Number.isInteger(p) && p > 0))];
  }
  const hits = (await Promise.all(ports.map(async (p) => [p, await probeDshPort(p)])))
    .filter(([, ok]) => ok).map(([p]) => p).sort((a, b) => a - b);
  const url = hits.length ? "http://127.0.0.1:" + hits[0] : "";
  dshCache = { url, at: Date.now() };
  return url;
}

// 把 config.json 里的 dsh.baseUrl 对齐到当前 DSH 端口；变了返回 true
function syncDshUrl(url) {
  if (!url) return false;
  const p = path.join(BRIDGE, "config.json");
  const c = readJson(p, null);
  if (!c?.dsh) return false;
  if (c.dsh.baseUrl === url) return false;
  c.dsh.baseUrl = url;
  writeJson(p, c);
  logTail("bridge", "[panel] dsh.baseUrl -> " + url);
  return true;
}
function pidOnPort(port) {
  try {
    const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true });
    const line = String(r.stdout || "").split(/\r?\n/).find((l) => l.includes("LISTENING") && new RegExp(":" + port + "\\s").test(l));
    if (!line) return null;
    const pid = Number(line.trim().split(/\s+/).pop());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch { return null; }
}

function killTree(pid) {
  if (!pid) return;
  try { spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, encoding: "utf8" }); } catch {}
}

const pidFile = (n) => path.join(RUN_DIR, n + ".pid");
const savePid = (n, p) => { try { fs.writeFileSync(pidFile(n), String(p)); } catch {} };
const loadPid = (n) => { try { return Number(fs.readFileSync(pidFile(n), "utf8").trim()) || null; } catch { return null; } };
const clearPid = (n) => { try { fs.rmSync(pidFile(n), { force: true }); } catch {} };

function startProcess(name, exe, args, cwd, env) {
  const out = fs.openSync(path.join(LOG_DIR, name + ".log"), "a");
  const child = spawn(exe, args, { cwd, env: { ...process.env, ...(env || {}) }, stdio: ["ignore", out, out], windowsHide: true });
  child.on("exit", (code) => { logTail(name, "[panel] " + name + " exited code=" + code); clearPid(name); });
  procs[name] = child;
  savePid(name, child.pid);
  logTail(name, "[panel] " + name + " started pid=" + child.pid);
  return child;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitPort(port, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await portAlive(port)) return true;
    await sleep(500);
  }
  return false;
}

async function startSnowluma() {
  if (await portAlive(SL_PORT)) return { ok: true, message: "SnowLuma 已在运行" };
  startProcess("snowluma", SNOWLUMA_NODE, ["index.mjs"], SNOWLUMA_APP, { SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD: SNOWLUMA_PW });
  const ok = await waitPort(SL_PORT, 30000);
  return { ok, message: ok ? "SnowLuma 已启动" : "SnowLuma 启动超时，看日志" };
}

let slToken = { value: "", at: 0 };
async function snowlumaToken() {
  if (slToken.value && Date.now() - slToken.at < 300000) return slToken.value;
  const r = await fetch("http://127.0.0.1:" + SL_PORT + "/api/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: SNOWLUMA_PW }),
  });
  const j = await r.json();
  slToken = { value: j?.token || "", at: Date.now() };
  return slToken.value;
}

async function accountInfo() {
  if (!(await portAlive(SL_PORT))) return null;
  const token = await snowlumaToken();
  if (!token) return null;
  try {
    const h = { "x-snowluma-token": token };
    const q = (await (await fetch("http://127.0.0.1:" + SL_PORT + "/api/qq-list", { headers: h })).json()).list || [];
    if (!q.length) return { online: false };
    const a = q[0];
    return { online: true, uin: String(a.uin), nickname: a.nickname, expected: EXPECTED_BOT_UIN, mismatch: String(a.uin) !== EXPECTED_BOT_UIN };
  } catch { return null; }
}

// 后台自愈：QQ 客户端重启 / 更新后 SnowLuma 注入会丢，OneBot 3000 就不见了，
// 面板却还显示「运行中」，用户只看到「未登录」。这里每 30 秒补一次注入。
let autoReinjectBusy = false;
setInterval(async () => {
  if (autoReinjectBusy) return;
  if (!(await portAlive(SL_PORT))) return;
  if (await portAlive(3000)) return; // OneBot 在，说明注入还在
  autoReinjectBusy = true;
  try {
    const r = await ensureAccount();
    logTail("panel", "[auto] OneBot 端口不在，重新注入：" + r.message);
  } catch (e) {
    logTail("panel", "[auto] 重新注入失败：" + (e?.message ?? e));
  } finally {
    autoReinjectBusy = false;
  }
}, 30000);

// 后台自愈 2：DSH 每次启动都会挑一个空闲端口（8199 → 5091 → 3829 …），
// 桥接指向旧端口就会「HTTP ERR fetch failed / 鲸鱼不回话」。这里每 30 秒对一次，
// 地址变了就只重启桥接（不停 SnowLuma，不丢 QQ 注入）。
let autoRebaseBusy = false;
setInterval(async () => {
  if (autoRebaseBusy) return;
  if (!(await portAlive(BR_PORT))) return;
  autoRebaseBusy = true;
  try {
    const found = await discoverDsh();
    if (!found) return;
    const cur = readJson(path.join(BRIDGE, "config.json"), null)?.dsh?.baseUrl || "";
    if (cur === found) return;
    logTail("panel", "[auto] DSH 端口变化 " + (cur || "(空)") + " -> " + found + "，重启桥接对齐");
    await rebaseDsh();
  } catch (e) {
    logTail("panel", "[auto] 对齐 DSH 地址失败：" + (e?.message ?? e));
  } finally {
    autoRebaseBusy = false;
  }
}, 30000);
// 把 SnowLuma 注入到正在运行的 QQ 客户端，并确认账号已上线
async function ensureAccount() {
  if (!(await portAlive(SL_PORT))) return { ok: false, message: "SnowLuma 未运行" };
  const token = await snowlumaToken();
  if (!token) return { ok: false, message: "SnowLuma 登录失败（密码被改过？）" };
  const h = { "x-snowluma-token": token, "content-type": "application/json" };
  try {
    for (let round = 0; round < 3; round++) {
      const list = (await (await fetch("http://127.0.0.1:" + SL_PORT + "/api/processes", { headers: h })).json()).list || [];
      const targets = list.filter((p) => !p.injected && p.status === "available");
      for (const p of targets) {
        await fetch("http://127.0.0.1:" + SL_PORT + "/api/processes/" + p.pid + "/load", { method: "POST", headers: h, body: "{}" });
      }
      if (!targets.length) break;
      await sleep(2500);
    }
    for (let i = 0; i < 10; i++) {
      const q = (await (await fetch("http://127.0.0.1:" + SL_PORT + "/api/qq-list", { headers: h })).json()).list || [];
      if (q.length) return { ok: true, message: "QQ 已上线：" + q[0].nickname + "(" + q[0].uin + ")" };
      await sleep(1500);
    }
    return { ok: false, message: "没检测到已登录的 QQ 账号，请在 QQ 客户端用小号扫码登录" };
  } catch (e) {
    return { ok: false, message: "注入 QQ 失败：" + String(e?.message || e) };
  }
}

async function startBridge() {
  await syncDshUrl(await discoverDsh());
  if (await portAlive(BR_PORT)) return { ok: true, message: "桥接已在运行" };
  startProcess("bridge", SNOWLUMA_NODE, ["src/bridge.js"], BRIDGE, {});
  const ok = await waitPort(BR_PORT, 25000);
  return { ok, message: ok ? "桥接已启动" : "桥接启动超时，看日志" };
}

async function stopAll() {
  const targets = [];
  const p1 = procs.snowluma?.pid || loadPid("snowluma") || pidOnPort(SL_PORT);
  const p2 = procs.bridge?.pid || loadPid("bridge") || pidOnPort(BR_PORT);
  if (p1) targets.push(["snowluma", p1]);
  if (p2) targets.push(["bridge", p2]);
  for (const [name, pid] of targets) { killTree(pid); clearPid(name); delete procs[name]; logTail(name, "[panel] " + name + " stopped"); }
  await sleep(1200);
  return { ok: true, message: targets.length ? "已停止" : "本来就没在运行" };
}

// 只重启桥接（不动 SnowLuma / QQ 注入）：DSH 换端口时用，重启代价最小
async function stopBridgeOnly() {
  const pid = procs.bridge?.pid || loadPid("bridge") || pidOnPort(BR_PORT);
  if (!pid) return false;
  killTree(pid);
  clearPid("bridge");
  delete procs.bridge;
  logTail("bridge", "[panel] bridge stopped（只重启桥接）");
  await sleep(1000);
  return true;
}

/**
 * 把 config.json 的 dsh.baseUrl 对齐到当前 DSH 端口。
 * restartBridge=false 时只改配置不重启（给调用方自己决定）。
 * 注意：这里是「只重启桥接」，不会像 /api/restart 那样连 SnowLuma 一起停——
 * 停 SnowLuma 会丢掉 QQ 注入，恢复要 20~30 秒，用户看到的就是「未登录」。
 */
async function rebaseDsh({ restartBridge = true } = {}) {
  const found = await discoverDsh();
  if (!found) return { ok: false, message: "没找到正在运行的 DSH" };
  const changed = await syncDshUrl(found);
  if (!restartBridge) return { ok: true, changed, url: found, message: (changed ? "已同步 DSH 地址 " : "DSH 地址没变 ") + found };
  if (await portAlive(BR_PORT)) await stopBridgeOnly();
  const b = await startBridge();
  return { ok: b.ok, changed, url: found, message: (changed ? "已把 DSH 地址更新为 " + found + "，" : "地址没变，") + b.message };
}

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }
function writeJson(file, obj) { fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n", "utf8"); }

async function bridgeStatus() {
  if (!(await portAlive(BR_PORT))) return null;
  let token = "";
  try { token = fs.readFileSync(path.join(BRIDGE, "state", "console-token"), "utf8").trim(); } catch {}
  try {
    const r = await fetch("http://127.0.0.1:" + BR_PORT + "/api/status", { headers: { "x-console-token": token } });
    if (!r.ok) return { error: "HTTP " + r.status };
    return await r.json();
  } catch (e) { return { error: String(e?.message || e) }; }
}

function readModel() {
  const c = readJson(path.join(BRIDGE, "config.json"), {});
  return {
    provider: c?.dsh?.provider || "deepseek-account",
    model: c?.dsh?.model || "deepseek-flash",
    effort: c?.dsh?.reasoningEffort || "high",
    ownerQQ: c?.ownerQQ ?? null,
    allowPrivate: c?.allow?.private ?? [],
    allowGroups: c?.allow?.groups ?? [],
    dshBaseUrl: c?.dsh?.baseUrl || "",
  };
}

// 模型清单来自 panel/models.json：想接新厂商就改那个文件（provider 必须先在 DSH
// 的 llm-pi-ai providers 里声明，见 ~/.dsh/profiles/desktop/cordis.patch.yml）。
const MODEL_CHOICES = (() => {
  const fallback = [
    { provider: "deepseek-account", model: "deepseek-flash", label: "DeepSeek-V4.1-Flash（快、便宜，推荐）" },
    { provider: "deepseek-account", model: "deepseek-v4-pro", label: "DeepSeek-V4-Pro（更强、更贵）" }
  ];
  try {
    const raw = fs.readFileSync(path.join(PANEL_DIR, "models.json"), "utf8");
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length) return list.filter((m) => m && m.provider && m.model);
  } catch {}
  return fallback;
})();
const EFFORT_CHOICES = [
  { id: "low", label: "low — 最省 token" },
  { id: "high", label: "high — 平衡（默认）" },
  { id: "max", label: "max — 最聪明、最烧钱" },
];

async function snapshot() {
  const [dshUrl, slUp, brUp] = await Promise.all([discoverDsh(), portAlive(SL_PORT), portAlive(BR_PORT)]);
  const dshUp = Boolean(dshUrl);
  const status = brUp ? await bridgeStatus() : null;
  const account = await accountInfo();
  return {
    dsh: dshUp, dshUrl, snowluma: slUp, bridge: brUp, status, account,
    model: readModel(),
    choices: { models: MODEL_CHOICES, efforts: EFFORT_CHOICES },
    logs: { snowluma: recent.snowluma.slice(-40), bridge: recent.bridge.slice(-60) },
  };
}
const HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<title>QQ 机器人控制台</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{--bg:#0f1216;--card:#171c22;--line:#252c35;--txt:#e6edf3;--dim:#8b98a5;--ok:#3fb950;--bad:#f85149;--warn:#d29922;--acc:#2f81f7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.6 "Segoe UI","Microsoft YaHei",system-ui,sans-serif}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 4px}.sub{color:var(--dim);margin-bottom:22px;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.card .k{color:var(--dim);font-size:12px;margin-bottom:6px}
.card .v{font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.dot{width:9px;height:9px;border-radius:50%;background:var(--bad);flex:none}
.dot.on{background:var(--ok)}.dot.warn{background:var(--warn)}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
button{background:var(--acc);color:#fff;border:0;border-radius:9px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer}
button.ghost{background:#21262d;border:1px solid var(--line)}
button.red{background:#b62324}
button:disabled{opacity:.5;cursor:not-allowed}
select{background:#0d1117;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:13px;min-width:240px}
.section{margin-top:24px}.section h2{font-size:14px;margin:0 0 10px;color:var(--dim);font-weight:600;letter-spacing:.5px}
pre{background:#0b0e12;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:12px;line-height:1.55;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:#c9d1d9;margin:0}
a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.links{display:flex;gap:16px;flex-wrap:wrap;font-size:13px}
.hint{color:var(--dim);font-size:12px;margin-top:10px}
#toast{position:fixed;right:18px;bottom:18px;background:#21262d;border:1px solid var(--line);padding:10px 14px;border-radius:9px;opacity:0;transition:.2s;font-size:13px;max-width:420px}
#toast.show{opacity:1}
</style></head><body><div class="wrap">
<h1>QQ 机器人控制台</h1>
<div class="sub">小鲸鱼 · 一键启停 / 模型与花费 / 状态一览</div>
<div class="grid">
  <div class="card"><div class="k">DSH</div><div class="v"><span class="dot" id="d-dsh"></span><span id="v-dsh">检测中</span></div></div>
  <div class="card"><div class="k">SnowLuma</div><div class="v"><span class="dot" id="d-sl"></span><span id="v-sl">检测中</span></div></div>
  <div class="card"><div class="k">桥接</div><div class="v"><span class="dot" id="d-br"></span><span id="v-br">检测中</span></div></div>
  <div class="card"><div class="k">QQ 账号</div><div class="v"><span class="dot" id="d-qq"></span><span id="v-qq">—</span></div></div>
</div>
<div class="row">
  <button id="btn-start">一键启动</button>
  <button id="btn-stop" class="red">全部停止</button>
  <button id="btn-restart" class="ghost">重启桥接</button>
  <button id="btn-fix" class="ghost" style="display:none">同步 DSH 端口</button>
  <button id="btn-refresh" class="ghost">刷新</button>
</div>
<div class="section"><h2>模型 / Token 使用方案</h2>
<div class="row">
  <select id="sel-model"></select>
  <select id="sel-effort" style="min-width:200px"></select>
  <button id="btn-save" class="ghost">保存并重启桥接</button>
</div>
<div class="hint">改这里 = 改桥接 config.json 的 dsh.model / dsh.reasoningEffort。更细的花费控制（唤醒概率、主动发言、发送频率、上下文条数）在 <a href="http://127.0.0.1:3100" target="_blank">桥接控制台 → 令牌与花费</a>。</div>
</div>
<div class="section"><h2>入口</h2>
<div class="links">
  <a href="http://127.0.0.1:3100" target="_blank">桥接控制台（模式 / 人格 / 白名单 / 花费）</a>
  <a href="http://127.0.0.1:5099" target="_blank">SnowLuma（QQ 账号 / OneBot）</a>
  <a href="http://127.0.0.1:14476" target="_blank">DSH</a>
</div></div>
<div class="section"><h2>最近活动</h2><pre id="activity">—</pre></div>
<div class="section"><h2>日志</h2><pre id="logs">—</pre></div>
<div class="hint">面板窗口最小化即可，关掉 = 全部停止。开机自启用「安装开机自启.bat」。</div>
</div><div id="toast"></div>
<script>
var $ = function (id) { return document.getElementById(id); };
function toast(msg, bad) {
  var t = $("toast"); t.textContent = msg; t.style.borderColor = bad ? "#f85149" : "#3fb950"; t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 3500);
}
function dot(el, ok, warn) { el.className = "dot" + (ok ? " on" : warn ? " warn" : ""); }
async function load() {
  var r = await fetch("/api/state"); var data = await r.json();
  dot($("d-dsh"), data.dsh);
  $("v-dsh").textContent = data.dsh ? data.dshUrl.replace("http://127.0.0.1:", ":") : "未运行";
  var stale = !!(data.dsh && data.model && data.model.dshBaseUrl && data.model.dshBaseUrl !== data.dshUrl);
  if (stale) { $("v-dsh").textContent += " ⚠ 端口已变"; $("v-dsh").style.color = "#d29922"; }
  else { $("v-dsh").style.color = ""; }
  $("btn-fix").style.display = stale ? "" : "none";
  dot($("d-sl"), data.snowluma); $("v-sl").textContent = data.snowluma ? "运行中" : "未运行";
  var b = data.status;
  dot($("d-br"), data.bridge, !!(data.bridge && b && b.snowluma && b.snowluma.degraded));
  $("v-br").textContent = data.bridge ? (b && b.mode ? b.mode : "运行中") : "未运行";
  var acc = data.account || null;
  var online = !!(acc && acc.online);
  var mismatch = !!(acc && acc.mismatch);
  var brOk = !!(b && b.snowluma && b.snowluma.accountOnline);
  dot($("d-qq"), online && !mismatch);
  if (online) {
    $("v-qq").textContent = acc.nickname + " · " + acc.uin + (mismatch ? " ⚠ 不是小号 " + acc.expected : "");
    $("v-qq").style.color = mismatch ? "#f85149" : "";
  } else if (brOk) {
    $("v-qq").textContent = "已登录（读取账号中）";
    $("v-qq").style.color = "";
  } else {
    $("v-qq").textContent = data.snowluma ? "未登录" : "—";
    $("v-qq").style.color = "";
  }
  $("activity").textContent = (b && b.activity) ? b.activity : "—";
  var lines = [].concat(data.logs.bridge || [], data.logs.snowluma || []);
  $("logs").textContent = lines.slice(-25).join("\\n") || "—";
  if (!$("sel-model").options.length) {
    $("sel-model").innerHTML = data.choices.models.map(function (m) { return '<option value="' + m.provider + "|" + m.model + '">' + m.label + "</option>"; }).join("");
    $("sel-effort").innerHTML = data.choices.efforts.map(function (e) { return '<option value="' + e.id + '">' + e.label + "</option>"; }).join("");
  }
  $("sel-model").value = data.model.provider + "|" + data.model.model;
  $("sel-effort").value = data.model.effort;
}
async function act(btn, url, body) {
  btn.disabled = true;
  try {
    var r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
    var j = await r.json();
    toast(j.message || (j.ok ? "完成" : "失败"), !j.ok);
  } catch (e) { toast("请求失败：" + e.message, true); }
  btn.disabled = false;
  load();
}
$("btn-start").onclick = function (e) { act(e.target, "/api/start"); };
$("btn-stop").onclick = function (e) { act(e.target, "/api/stop"); };
$("btn-restart").onclick = function (e) { act(e.target, "/api/restart"); };
$("btn-refresh").onclick = function () { load(); };
$("btn-fix").onclick = function (e) { act(e.target, "/api/fix-dsh"); };
$("btn-save").onclick = function (e) {
  var v = $("sel-model").value.split("|");
  act(e.target, "/api/model", { provider: v[0], model: v[1], effort: $("sel-effort").value });
};
load(); setInterval(load, 5000);
</script></body></html>`;

function send(res, code, body, type) {
  const buf = typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, { "content-type": (type || "application/json") + "; charset=utf-8", "cache-control": "no-store" });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => b += c);
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) return send(res, 200, HTML, "text/html");
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, await snapshot());
    if (req.method === "POST" && url.pathname === "/api/start") {
      const a = await startSnowluma();
      const c = a.ok ? await ensureAccount() : { ok: false, message: "跳过账号连接" };
      const b = await startBridge();
      const ok = a.ok && b.ok && (c.ok || c.ok === undefined);
      return send(res, 200, { ok, message: [a.message, c.message, b.message].filter(Boolean).join("；") });
    }
    if (req.method === "POST" && url.pathname === "/api/account") {
      return send(res, 200, await ensureAccount());
    }
    if (req.method === "POST" && url.pathname === "/api/stop") return send(res, 200, await stopAll());
    if (req.method === "POST" && url.pathname === "/api/fix-dsh") {
      dshCache = { url: "", at: 0 };
      // 只重启桥接：以前这里调 stopAll()，会把 SnowLuma 一起停掉，QQ 直接掉到「未登录」
      return send(res, 200, await rebaseDsh());
    }
    if (req.method === "POST" && url.pathname === "/api/restart") {
      await stopAll();
      const b = await startBridge();
      return send(res, 200, { ok: b.ok, message: "桥接已重启：" + b.message });
    }
    if (req.method === "POST" && url.pathname === "/api/model") {
      const body = await readBody(req);
      const cfgFile = path.join(BRIDGE, "config.json");
      const cfg = readJson(cfgFile, null);
      if (!cfg) return send(res, 500, { ok: false, message: "读不到 config.json" });
      if (body.model) cfg.dsh.model = String(body.model);
      if (body.provider) cfg.dsh.provider = String(body.provider);
      if (body.effort) cfg.dsh.reasoningEffort = String(body.effort);
      writeJson(cfgFile, cfg);
      await stopAll();
      const b = await startBridge();
      return send(res, 200, { ok: b.ok, message: "已保存 " + cfg.dsh.model + " / " + cfg.dsh.reasoningEffort + "，" + b.message });
    }
    send(res, 404, { ok: false, message: "not found" });
  } catch (e) {
    send(res, 500, { ok: false, message: String(e?.message || e) });
  }
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    // 常见场景：上一次的控制台还在后台跑（窗口被关掉但进程没退），或者误点两次 bat。
    // 这时不该甩一堆 stack 给用户，直接开浏览器指向已在跑的那个实例。
    console.log("");
    console.log("[panel] 端口 " + PANEL_PORT + " 已被占用：控制台可能已经在运行。");
    console.log("[panel] 正在打开 http://127.0.0.1:" + PANEL_PORT + " —— 如果页面打不开，说明占用端口的是别的程序，请先结束它。");
    console.log("");
    try { spawn("cmd", ["/c", "start", "", "http://127.0.0.1:" + PANEL_PORT], { detached: true, stdio: "ignore", windowsHide: true }).unref(); } catch {}
    setTimeout(() => process.exit(0), 1500);
    return;
  }
  console.error("[panel] 启动失败：", error);
  process.exit(1);
});

server.listen(PANEL_PORT, "127.0.0.1", () => {
  console.log("[panel] http://127.0.0.1:" + PANEL_PORT);
  try { spawn("cmd", ["/c", "start", "", "http://127.0.0.1:" + PANEL_PORT], { detached: true, stdio: "ignore", windowsHide: true }).unref(); } catch {}
  (async () => {
    if (!(await portAlive(SL_PORT))) await startSnowluma();
    if (await portAlive(SL_PORT)) await ensureAccount();
    if (!(await portAlive(BR_PORT))) await startBridge();
  })();
});