import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const [url, out, ...flags] = process.argv.slice(2);
if (!url) { console.error("usage: node dl.mjs <url> <outfile> [--head]"); process.exit(2); }

function get(u, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 8) return reject(new Error("too many redirects"));
    const mod = u.startsWith("https:") ? https : http;
    const req = mod.get(u, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" }, timeout: 60000 }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = new URL(res.headers.location, u).toString();
        res.resume();
        return resolve(get(loc, redirects + 1));
      }
      resolve(res);
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

const res = await get(url);
console.log("HTTP " + res.statusCode + " " + (res.headers["content-type"] || "") + " len=" + (res.headers["content-length"] || "?"));
if (res.statusCode !== 200) { res.resume(); process.exit(1); }
if (flags.includes("--head") || !out) { res.resume(); process.exit(0); }
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
const total = Number(res.headers["content-length"] || 0);
let got = 0, last = 0;
const ws = fs.createWriteStream(out);
res.on("data", (c) => {
  got += c.length;
  if (Date.now() - last > 2000) { last = Date.now(); console.log("  " + (got / 1048576).toFixed(1) + "MB" + (total ? " / " + (total / 1048576).toFixed(1) + "MB (" + (got / total * 100).toFixed(0) + "%)" : "")); }
});
res.pipe(ws);
ws.on("finish", () => console.log("saved " + out + " (" + (got / 1048576).toFixed(2) + " MB)"));
ws.on("error", (e) => { console.error("write error", e); process.exit(1); });