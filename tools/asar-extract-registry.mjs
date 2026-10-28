import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize); fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
const base = 16 + headerSize;
function node(pathArr) { let n = header; for (const s of pathArr) { n = n?.files?.[s]; if (!n) return null; } return n; }
const src = "dsh/node_modules/@deepseek-ai/dsh-agent-preset-registry/lib/index.js";
const n = node(src.split("/"));
const buf = Buffer.alloc(n.size); fs.readSync(fd, buf, 0, n.size, base + Number(n.offset));
const s = buf.toString("utf8");
fs.writeFileSync("G:/dsh/tmp/preset-registry.js", s);
console.log("size", s.length);
for (const kw of ["presets", "scan", "builtin", "built-in", "register(", "kind", "source"]) {
  const idx = [];
  let i = s.indexOf(kw);
  while (i >= 0 && idx.length < 6) { idx.push(i); i = s.indexOf(kw, i + 1); }
  console.log(kw, "->", idx.length, "hits");
}