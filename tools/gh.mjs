import https from "node:https";
const u = process.argv[2];
https.get(u, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/vnd.github+json" } }, (res) => {
  let b = ""; res.on("data", c => b += c); res.on("end", () => {
    console.log("STATUS", res.statusCode);
    try {
      const j = JSON.parse(b);
      console.log("tag:", j.tag_name, "name:", j.name, "published:", j.published_at);
      for (const a of j.assets || []) console.log("  asset:", a.name, (a.size / 1048576).toFixed(1) + "MB", a.browser_download_url);
    } catch { console.log(b.slice(0, 800)); }
  });
}).on("error", e => console.log("ERR", e.message));