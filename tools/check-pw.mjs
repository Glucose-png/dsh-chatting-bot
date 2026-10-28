import { scryptSync } from "node:crypto";
import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("G:/dsh/SnowLuma/app/config/webui.json", "utf8"));
const tryPw = (p) => scryptSync(p, Buffer.from(s.passwordSalt, "hex"), 64, { N: 16384, r: 8, p: 1 }).toString("hex") === s.passwordHash;
console.log("mustChange:", s.mustChangePassword, "updated:", s.updatedAt);
console.log("change-me ->", tryPw("change-me"));
console.log("change-me ->", tryPw("change-me"));