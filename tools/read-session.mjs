import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const dir = "C:/Users/格鲁寇丝/.dsh/sessions/--C-Users-~683C~9C81~5BC7~4E1D--/session-795b4621-4708-4cea-a0e7-da9edca49572";
for (const f of fs.readdirSync(dir)) {
  const p = path.join(dir, f);
  const st = fs.statSync(p);
  console.log("FILE", f, st.size, st.mtime.toISOString());
}
const file = path.join(dir, "session.v4.jsonl.zstd");
if (fs.existsSync(file)) {
  const buf = fs.readFileSync(file);
  try {
    const out = zlib.zstdDecompressSync ? zlib.zstdDecompressSync(buf) : null;
    if (out) {
      const lines = out.toString("utf8").trim().split("\n");
      console.log("lines:", lines.length);
      console.log(lines.slice(-6).join("\n").slice(0, 3000));
    } else console.log("no zstd support");
  } catch (e) { console.log("decompress error:", e.message); }
}