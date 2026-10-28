import { scryptSync, randomBytes } from "node:crypto";
import fs from "node:fs";
const password = "change-me";
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
const now = new Date().toISOString();
const state = {
  passwordHash: hash.toString("hex"),
  passwordSalt: salt.toString("hex"),
  mustChangePassword: false,
  generatedAt: now,
  updatedAt: now,
};
fs.writeFileSync("G:/dsh/SnowLuma/app/config/webui.json", JSON.stringify(state, null, 2), "utf8");
console.log("written", state.passwordHash.length, state.passwordSalt.length);