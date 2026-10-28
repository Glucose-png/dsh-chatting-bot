import http from "node:http";
const paths = ["/", "/index.html", "/api/health", "/api/status", "/api/profiles"];
for (const p of paths) {
  await new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: 14476, path: p, timeout: 8000 }, (res) => {
      let b = ""; res.on("data", c => b += c); res.on("end", () => {
        console.log("===", p, res.statusCode, res.headers["content-type"]);
        console.log(b.slice(0, 500).replace(/\s+/g, " "));
        resolve();
      });
    });
    req.on("error", e => { console.log(p, "ERR", e.message); resolve(); });
    req.on("timeout", () => { req.destroy(); resolve(); });
  });
}