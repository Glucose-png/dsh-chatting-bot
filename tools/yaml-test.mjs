import fs from "node:fs";
import YAML from "G:/dsh/qqbot/qq-bridge/node_modules/js-yaml/index.js";
const p = "G:/dsh/qqbot/qq-bridge/plugins/qq-agent-presets/presets/qq-chat-v2.patch.yml";
try {
  const doc = YAML.load(fs.readFileSync(p, "utf8"));
  console.log("parsed ok, top-level items:", Array.isArray(doc) ? doc.length : typeof doc);
  console.log("first keys:", Array.isArray(doc) ? Object.keys(doc[0]) : "-");
} catch (e) { console.log("PARSE ERROR:", e.message); }