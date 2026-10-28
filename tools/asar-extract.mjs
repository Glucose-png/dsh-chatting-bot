import fs from "node:fs";
const p = "E:/deepseek_harness/resources/app.asar";
const fd = fs.openSync(p, "r");
const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0);
const headerSize = head.readUInt32LE(12);
const jsonBuf = Buffer.alloc(headerSize); fs.readSync(fd, jsonBuf, 0, headerSize, 16);
const header = JSON.parse(jsonBuf.toString("utf8"));
const base = 16 + headerSize;
function getNode(pathArr) {
  let n = header;
  for (const seg of pathArr) { n = n.files?.[seg]; if (!n) return null; }
  return n;
}
const targets = [
  ["dsh/node_modules/@deepseek-ai/dsh-agent-preset/lib/index.js", "G:/dsh/tmp/agent-preset-index.js"],
  ["dsh/node_modules/@deepseek-ai/dsh-agent-preset/package.json", "G:/dsh/tmp/agent-preset-package.json"],
];
fs.mkdirSync("G:/dsh/tmp", { recursive: true });
for (const [src, dst] of targets) {
  const n = getNode(src.split("/"));
  if (!n || n.size == null) { console.log("miss", src); continue; }
  const buf = Buffer.alloc(n.size);
  fs.readSync(fd, buf, 0, n.size, base + Number(n.offset));
  fs.writeFileSync(dst, buf);
  console.log("extracted", src, n.size);
}