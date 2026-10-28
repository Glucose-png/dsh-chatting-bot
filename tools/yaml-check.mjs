import fs from "node:fs";
import { pathToFileURL } from "node:url";
const YAML = (await import(pathToFileURL("E:/dsh_chatting_bot/qqbot/qq-bridge/node_modules/js-yaml/index.js").href)).default;
const doc = YAML.load(fs.readFileSync("C:/Users/格鲁寇丝/.dsh/profiles/desktop/cordis.patch.yml", "utf8"));
const llm = doc.find(r => r.id === "llm-pi-ai");
console.log("providers:", Object.keys(llm?.config?.providers ?? {}).join(", "));