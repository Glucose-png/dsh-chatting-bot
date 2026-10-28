import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize); fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
const base = 16 + headerSize;
function node(pathArr) { let n = header; for (const s of pathArr) { n = n?.files?.[s]; if (!n) return null; } return n; }
const src = "dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js";
const n = node(src.split("/"));
const buf = Buffer.alloc(n.size); fs.readSync(fd, buf, 0, n.size, base + Number(n.offset));
fs.writeFileSync("G:/dsh/tmp/app-boot.js", buf);
console.log("size", n.size);