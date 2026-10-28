import https from "node:https";
import fs from "node:fs";
const url = "https://q1.qlogo.cn/g?b=qq&nk=3949453849&s=640&t=" + Date.now();
await new Promise((resolve) => {
  https.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 15000 }, (res) => {
    console.log("HTTP", res.statusCode, res.headers["content-type"]);
    const ws = fs.createWriteStream("G:/dsh/qqbot/assets/avatar-check.jpg");
    res.pipe(ws); ws.on("finish", resolve);
  }).on("error", (e) => { console.log("ERR", e.message); resolve(); });
});