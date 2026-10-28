import fs from "node:fs";
const p = "G:/dsh/qqbot/qq-bridge/config.json";
const c = JSON.parse(fs.readFileSync(p, "utf8"));
console.log("old:", c.dsh.baseUrl);
c.dsh.baseUrl = "http://127.0.0.1:4477";
fs.writeFileSync(p, JSON.stringify(c, null, 2) + "\n", "utf8");
console.log("new:", c.dsh.baseUrl, "mode:", c.dsh.model);