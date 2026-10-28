import fs from "node:fs";
const p = "C:/Users/格鲁寇丝/.dsh/profiles/desktop/package.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
console.log("deps:", JSON.stringify(j.dependencies, null, 1));
for (const [k, v] of Object.entries(j.dependencies || {})) {
  if (!v.startsWith("link:")) continue;
  const target = v.slice(5);
  console.log(k, "->", target, "exists:", fs.existsSync(target));
}
const nm = "C:/Users/格鲁寇丝/.dsh/profiles/desktop/node_modules/qq-agent-presets";
console.log("nm exists:", fs.existsSync(nm), "realpath:", (() => { try { return fs.realpathSync(nm); } catch (e) { return "ERR " + e.message; } })());
console.log("patch readable:", fs.existsSync(nm + "/presets/qq-chat-v2.patch.yml"));