import fs from "node:fs";
import { execSync } from "node:child_process";
const out = execSync("netstat -ano", { encoding: "utf8" });
const ports = [...new Set([...out.matchAll(/127\.0\.0\.1:(\d+)\s/g)].map(m => Number(m[1])))].filter(p => p > 1024);
const probe = async (p) => {
  try {
    const ctrl = AbortSignal.timeout(700);
    const r = await fetch(`http://127.0.0.1:${p}/`, { signal: ctrl });
    const t = await r.text();
    return t.includes("dsh web authentication required");
  } catch { return false; }
};
const hits = [];
for (const p of ports) if (await probe(p)) hits.push(p);
console.log("dsh candidates:", hits.join(",") || "(none)");
if (!hits.length) process.exit(2);
const url = `http://127.0.0.1:${hits[0]}`;
const f = "G:/dsh/qqbot/qq-bridge/config.json";
const cfg = JSON.parse(fs.readFileSync(f, "utf8"));
console.log("baseUrl:", cfg.dsh.baseUrl, "->", url);
cfg.dsh.baseUrl = url;
fs.writeFileSync(f, JSON.stringify(cfg, null, 2) + "\n", "utf8");