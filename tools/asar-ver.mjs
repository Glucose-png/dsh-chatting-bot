import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize);
fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
const base = 16 + headerSize;
function find(node, pathArr, name) {
  if (!node.files) return null;
  for (const [k, v] of Object.entries(node.files)) {
    const q = [...pathArr, k];
    if (k === name && v.size != null) return { q, v };
    const r = find(v, q, name);
    if (r) return r;
  }
  return null;
}
for (const target of ["package.json"]) {
  const hit = find(header, [], target);
  if (!hit) continue;
  const { q, v } = hit;
  if (v.size > 200000) { console.log("skip big", q.join("/"), v.size); continue; }
  const buf = Buffer.alloc(v.size);
  fs.readSync(fd, buf, 0, v.size, base + Number(v.offset));
  const j = JSON.parse(buf.toString("utf8"));
  console.log(q.join("/"), "=> version", j.version, "name", j.name);
}