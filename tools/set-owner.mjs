import fs from "node:fs";
const p = "G:/dsh/qqbot/qq-bridge/config.json";
const c = JSON.parse(fs.readFileSync(p, "utf8"));
c.ownerQQ = 100000000;
c.allow.private = [100000000];
c.snowluma.followDiscoveredEndpoint = true;
fs.writeFileSync(p, JSON.stringify(c, null, 2) + "\n", "utf8");
console.log("owner:", c.ownerQQ, "allow.private:", c.allow.private, "mode preserved");