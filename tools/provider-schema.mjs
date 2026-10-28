import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const hs = head.readUInt32LE(12);
const jb = Buffer.alloc(hs); fs.readSync(fd, jb, 0, hs, 16);
const h = JSON.parse(jb.toString("utf8"));
const base = 16 + hs;
function get(pathArr) { let n = h; for (const s of pathArr) { n = n?.files?.[s]; if (!n) return null; } return n; }
const src = "dsh/node_modules/@deepseek-ai/dsh-llm-pi-ai/lib/index.js";
const n = get(src.split("/"));
if (!n) { console.log("no pi-ai pkg"); process.exit(0); }
const buf = Buffer.alloc(n.size); fs.readSync(fd, buf, 0, n.size, base + Number(n.offset));
const s = buf.toString("utf8");
for (const kw of ["apiKeyEnv", "apiKey", "headers", "baseURL"]) {
  const idx = s.indexOf(kw);
  console.log(kw, "->", idx >= 0 ? JSON.stringify(s.slice(Math.max(0, idx - 80), idx + 120)) : "(none)");
}