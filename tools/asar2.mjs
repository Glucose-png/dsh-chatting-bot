import fs from "node:fs";
const fd = fs.openSync("E:/deepseek_harness/resources/app.asar", "r");
const b = Buffer.alloc(16); fs.readSync(fd, b, 0, 16, 0);
const headerSize = b.readUInt32LE(12);
const hb = Buffer.alloc(headerSize); fs.readSync(fd, hb, 0, headerSize, 16);
const header = JSON.parse(hb.toString("utf8"));
const dataStart = 16 + headerSize;
const dump = (p) => {
  const parts = p.split("/").filter(Boolean);
  let node = header;
  for (const k of parts) node = node.files[k];
  const off = dataStart + Number(node.offset);
  const buf = Buffer.alloc(node.size); fs.readSync(fd, buf, 0, node.size, off);
  console.log("=== " + p + " ===");
  console.log(buf.toString("utf8").slice(0, 1200));
};
dump("/package.json");
dump("/dsh/package.json");