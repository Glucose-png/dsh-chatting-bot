import fs from "node:fs";
import { pathToFileURL } from "node:url";

const NODE = "C:\\Users\\格鲁寇丝\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\node\\bin\\node.exe";
const SCRIPT = "G:\\dsh\\qqbot\\qq-bridge\\src\\mcp-desktop.js";
const patchFile = "C:/Users/格鲁寇丝/.dsh/profiles/desktop/cordis.patch.yml";

let text = fs.readFileSync(patchFile, "utf8");
const marker = "# === qq-bridge MCP END ===";
if (text.includes("id: mcp-desktop")) {
  console.log("mcp-desktop 已注册，跳过");
} else {
  const block = [
    "",
    "# === desktop-control BEGIN ===（不在 setup-dsh 托管范围内，重跑 setup 不会删）",
    "- insert:",
    "    - id: mcp-desktop",
    "      name: '@deepseek-ai/dsh-mcp-client'",
    "      config:",
    "        serverName: desktop",
    "        transport: stdio",
    `        command: '${NODE.replace(/\\/g, "\\\\")}'`,
    "        args:",
    `          - '${SCRIPT.replace(/\\/g, "\\\\")}'`,
    "        toolCallTimeoutMs: 120000",
    "# === desktop-control END ===",
    ""
  ].join("\n");
  if (text.includes(marker)) text = text.replace(marker, marker + "\n" + block);
  else text = text + "\n" + block;

  const YAML = (await import(pathToFileURL("G:/dsh/qqbot/qq-bridge/node_modules/js-yaml/index.js").href)).default;
  const doc = YAML.load(text);
  console.log("YAML ok, top-level rows:", Array.isArray(doc) ? doc.length : "?");
  fs.writeFileSync(patchFile, text, "utf8");
  console.log("已写入 cordis.patch.yml");
}