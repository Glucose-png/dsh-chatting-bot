import fs from "node:fs";
const fd = fs.openSync("E:/deepseek_harness/resources/app.asar", "r");
const b = Buffer.alloc(16); fs.readSync(fd, b, 0, 16, 0);
const headerSize = b.readUInt32LE(12);
const hb = Buffer.alloc(headerSize); fs.readSync(fd, hb, 0, headerSize, 16);
const header = JSON.parse(hb.toString("utf8"));
const base = 16 + headerSize;
function walk(node, prefix) {
  for (const [k, v] of Object.entries(node.files || {})) {
    const p = prefix + "/" + k;
    if (v.files) walk(v, p);
    else if (k === "package.json" && p.split("/").length <= 3) console.log(p, v.size);
  }
}
walk(header, "");