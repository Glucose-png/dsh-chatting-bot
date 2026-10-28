import fs from "node:fs";
const p = "C:/Users/格鲁寇丝/.dsh/profiles/desktop/cordis.patch.yml";
const before = fs.readFileSync(p);
fs.writeFileSync(p, before);
console.log("touched profile patch, bytes:", before.length);