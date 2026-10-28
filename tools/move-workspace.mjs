import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const HOME = "C:/Users/格鲁寇丝/.dsh";
const MAP = [
  ["G:\\dsh\\qqbot\\qq-bridge\\state\\slang-agent", "E:\\dsh_chatting_bot\\qqbot\\qq-bridge\\state\\slang-agent"],
  ["G:\\dsh\\qqbot\\workspace", "E:\\dsh_chatting_bot\\qqbot\\workspace"],
  ["G:\\dsh", "E:\\dsh_chatting_bot"],
];

// 1) 备份并改写 workspace.json
const wsFile = path.join(HOME, "storages/workspace.json");
const raw = fs.readFileSync(wsFile, "utf8");
fs.writeFileSync(wsFile + ".bak-g-migration", raw, "utf8");
const ws = JSON.parse(raw);
let changed = 0;
for (const w of Object.values(ws.tables.workspaces)) {
  const hit = MAP.find(([oldP]) => w.path === oldP);
  if (hit) { console.log("workspace:", w.path, "->", hit[1]); w.path = hit[1]; changed++; }
}
fs.writeFileSync(wsFile, JSON.stringify(ws, null, 2) + "\n", "utf8");
console.log("workspace.json 改写条目:", changed);

// 2) 迁移会话目录：--G-dsh-- -> --E-dsh_chatting_bot--
const sessionsDir = path.join(HOME, "sessions");
const enc = (p) => "--" + p.replace(/:/g, "").replace(/[\\/]/g, "-") + "--";
const dirs = fs.readdirSync(sessionsDir).filter((d) => d.startsWith("--G-dsh"));
for (const d of dirs) {
  const oldPath = path.join(sessionsDir, d);
  // 目录名反解出原路径：--G-dsh-qqbot-workspace-- -> G:\dsh\qqbot\workspace
  const inner = d.replace(/^--/, "").replace(/--$/, "");
  const parts = inner.split("-");
  const rawPath = parts[0] + ":\\" + parts.slice(1).join("\\");
  const hit = MAP.find(([oldP]) => oldP.toLowerCase() === rawPath.toLowerCase());
  if (!hit) { console.log("skip (无映射):", d, "=>", rawPath); continue; }
  const newPath = hit[1];
  const newDir = path.join(sessionsDir, enc(newPath));
  fs.mkdirSync(newDir, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(oldPath)) {
    const src = path.join(oldPath, f);
    if (!fs.statSync(src).isFile()) continue;
    let buf = fs.readFileSync(src);
    try {
      const plain = zlib.zstdDecompressSync(buf).toString("utf8");
      const patched = plain.split(JSON.stringify(hit[0])).join(JSON.stringify(newPath));
      buf = zlib.zstdCompressSync(Buffer.from(patched, "utf8"));
    } catch (e) { /* 非 zstd 文件原样复制 */ }
    fs.writeFileSync(path.join(newDir, f), buf);
    n++;
  }
  console.log("session dir:", d, "->", path.basename(newDir), `(${n} 文件)`);
}