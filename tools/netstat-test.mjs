const { spawnSync } = await import("node:child_process");
const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true, shell: false });
console.log("status", r.status, "err", r.error?.code, "len", (r.stdout||"").length);