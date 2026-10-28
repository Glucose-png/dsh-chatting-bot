import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize); fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
function findPkgDir(node, pathArr) {
  if (!node.files) return null;
  if (node.files["package.json"] && pathArr.join("/").endsWith("@deepseek-ai")) return pathArr;
  for (const [k, v] of Object.entries(node.files)) {
    if (!v.files) continue;
    const r = findPkgDir(v, [...pathArr, k]);
    if (r) return r;
  }
  return null;
}
function get(pathArr) { let n = header; for (const s of pathArr) { n = n?.files?.[s]; if (!n) return null; } return n; }
// locate dsh/node_modules/@deepseek-ai by walking
function walk(node, pathArr, out) {
  if (!node.files) return;
  for (const [k, v] of Object.entries(node.files)) {
    const q = [...pathArr, k];
    if (v.files) { if (k.startsWith("@")) out.push(q); walk(v, q, out); }
  }
}
const scopes = []; walk(header, [], scopes);
const target = scopes.find(s => s.join("/").endsWith("dsh/node_modules/@deepseek-ai"));
console.log("scope path:", target?.join("/"));
if (!target) process.exit(1);
const nm = get(target).files;
const names = Object.keys(nm);
console.log("pkgs:", names.length);
console.log("persona:", names.filter(n => /persona|prompt|role/i.test(n)).join(", "));
console.log("web/tool:", names.filter(n => /tool-web|web-search|search/i.test(n)).join(", "));