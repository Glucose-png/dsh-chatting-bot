import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize); fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
const base = 16 + headerSize;
function walk(node, pathArr, out) {
  if (!node.files) return;
  for (const [k, v] of Object.entries(node.files)) { const q = [...pathArr, k]; if (v.files) walk(v, q, out); else out.push({ q, v }); }
}
const all = []; walk(header, [], all);
const js = all.filter(f => /\.(js|mjs|cjs)$/.test(f.q.join("/")) && f.v.size < 900000);
console.log("scanning", js.length, "js files");
const hits = [];
for (const f of js) {
  const buf = Buffer.alloc(f.v.size); fs.readSync(fd, buf, 0, f.v.size, base + Number(f.v.offset));
  const s = buf.toString("utf8");
  if (s.includes("bundles") && (s.includes("profile") || s.includes("patch"))) hits.push({ path: f.q.join("/"), size: f.v.size, hasBundlePatch: s.includes("bundle") && s.includes("patch") });
}
for (const h of hits.slice(0, 25)) console.log(h.size, h.path, h.hasBundlePatch ? "[bundle+patch]" : "");