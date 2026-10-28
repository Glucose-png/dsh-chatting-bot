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
  for (const [k, v] of Object.entries(node.files)) {
    const q = [...pathArr, k];
    if (v.files) walk(v, q, out);
    else out.push({ q, v });
  }
}
const all = []; walk(header, [], all);
const hits = all.filter((f) => /agent-preset|preset/i.test(f.q.join("/")) && /\.(js|mjs|cjs|json|yml)$/.test(f.q[f.q.length-1]));
console.log("preset-related files:", hits.length);
for (const h of hits.slice(0, 40)) console.log(" ", h.q.join("/"), h.v.size);