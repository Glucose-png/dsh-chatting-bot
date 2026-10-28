import fs from "node:fs";
import { pathToFileURL } from "node:url";
const yamlUrl = pathToFileURL("G:/dsh/qqbot/qq-bridge/node_modules/js-yaml/index.js").href;
const YAML = (await import(yamlUrl)).default;
const p = "G:/dsh/qqbot/qq-bridge/plugins/qq-agent-presets/presets/qq-chat-v2.patch.yml";
try {
  const doc = YAML.load(fs.readFileSync(p, "utf8"));
  console.log("parsed ok, items:", Array.isArray(doc) ? doc.length : typeof doc);
  console.log("item0 keys:", Array.isArray(doc) ? Object.keys(doc[0]) : "-");
  console.log("item0 insert[0] keys:", Object.keys(doc[0].insert[0]));
} catch (e) { console.log("PARSE ERROR:", e.message); }