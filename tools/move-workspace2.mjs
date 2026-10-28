import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const HOME = "C:/Users/格鲁寇丝/.dsh";
const MAP = [
  ["G:\\dsh\\qqbot\\qq-bridge\\state\\slang-agent", "E:\\dsh_chatting_bot\\qqbot\\qq-bridge\\state\\slang-agent"],
  ["G:\\dsh\\qqbot\\workspace", "E:\\dsh_chatting_bot\\qqbot\\workspace"],
  ["G:\\dsh", "E:\\dsh_chatting_bot"],
];
const enc = (p) => "--" + p.replace(/:/g, "").replace(/[\\/]/g, "-") + "--";
const sessionsDir = path.join(HOME, "sessions");

function copyTree(src, dst, oldPath, newPath) {
  fs.mkdirSync(dst, { recursive: true });
  let files = 0, patched = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { const r = copyTree(s, d, oldPath, newPath); files += r.files; patched += r.patched; continue; }
    let buf = fs.readFileSync(s);
    try {
      const plain = zlib.zstdDecompressSync(buf).toString("utf8");
      const out = plain.split(JSON.stringify(oldPath)).join(JSON.stringify(newPath))
                        .split(oldPath.replace(/\\/g, "/")).join(newPath.replace(/\\/g, "/"));
      if (out !== plain) { buf = zlib.zstdCompressSync(Buffer.from(out, "utf8")); patched++; }
    } catch {}
    fs.writeFileSync(d, buf);
    files++;
  }
  return { files, patched };
}

for (const [oldPath, newPath] of MAP) {
  const src = path.join(sessionsDir, enc(oldPath));
  if (!fs.existsSync(src)) { console.log("缺目录:", enc(oldPath)); continue; }
  const r = copyTree(src, path.join(sessionsDir, enc(newPath)), oldPath, newPath);
  console.log(`${enc(oldPath)} -> ${enc(newPath)}  复制 ${r.files} 文件，改写 cwd ${r.patched} 个`);
}
console.log("--- sessions 目录 ---");
console.log(fs.readdirSync(sessionsDir).filter(d => d.startsWith("--E")).join("\n"));