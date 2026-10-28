import fs from "node:fs";
const p = "C:/Users/格鲁寇丝/.dsh/profiles/desktop/cordis.patch.yml";
let t = fs.readFileSync(p, "utf8");
const stamp = "# reload " + new Date().toISOString();
t = t.replace(/\n# reload [^\n]*\n?$/m, "\n") + "\n" + stamp + "\n";
fs.writeFileSync(p, t, "utf8");
console.log("appended:", stamp);