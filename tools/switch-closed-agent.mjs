import fs from "node:fs";
const modeFile = "G:/dsh/qqbot/qq-bridge/state/mode.json";
const cfgFile = "G:/dsh/qqbot/qq-bridge/config.json";

const mode = { mode: "closed-agent", closedAgentPreset: "" };
fs.writeFileSync(modeFile, JSON.stringify(mode, null, 2) + "\n", "utf8");
console.log("mode.json ->", JSON.stringify(mode));

const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
const before = cfg.sessionCwd;
cfg.sessionCwd = "C:/Users/格鲁寇丝";
cfg.closedAgentPreset = "";
fs.writeFileSync(cfgFile, JSON.stringify(cfg, null, 2) + "\n", "utf8");
console.log("sessionCwd:", before, "->", cfg.sessionCwd);
console.log("mode in config (bridge 用 state/mode.json):", cfg.mode ?? "(未设置)");