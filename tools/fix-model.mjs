import fs from "node:fs";
const p = "G:/dsh/qqbot/qq-bridge/config.json";
const c = JSON.parse(fs.readFileSync(p, "utf8"));
c.dsh.provider = "deepseek-account";
c.dsh.model = "deepseek-flash";
c.dsh.reasoningEffort = "high";
fs.writeFileSync(p, JSON.stringify(c, null, 2) + "\n", "utf8");
console.log("provider:", c.dsh.provider, c.dsh.model, c.dsh.reasoningEffort);