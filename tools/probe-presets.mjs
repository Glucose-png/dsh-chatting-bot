import { NodeApiClient } from "file:///G:/dsh/qqbot/qq-bridge/src/dsh-client.js";
const c = new NodeApiClient("http://127.0.0.1:14476", 20000, { token: "" });
try {
  const r = await c.callUnary("agentPresets/list", {}, undefined);
  const list = r?.presets ?? r?.items ?? r;
  console.log("PRESETS:", JSON.stringify(list).slice(0, 800));
} catch (e) { console.log("PRESETS ERR:", e?.message || e); }
try {
  const s = await c.callUnary("settings/describe", {}, undefined);
  const txt = JSON.stringify(s);
  const i = txt.indexOf("qq-mode");
  console.log("SETTINGS len", txt.length, "qq-mode at", i);
} catch (e) { console.log("SETTINGS ERR:", e?.message || e); }
process.exit(0);