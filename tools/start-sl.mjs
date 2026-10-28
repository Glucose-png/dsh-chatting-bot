const base = "http://127.0.0.1:5099";
const j = async (u, o) => (await fetch(u, o)).json();
const login = await j(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) });
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
let procs = (await j(base + "/api/processes", { headers: h })).list || [];
console.log("procs:", JSON.stringify(procs.map(p => ({ pid: p.pid, injected: p.injected, status: p.status }))));
for (const p of procs.filter(x => !x.injected && x.status === "available")) {
  const r = await fetch(base + "/api/processes/" + p.pid + "/load", { method: "POST", headers: h, body: "{}" });
  console.log("inject", p.pid, r.status);
}
await new Promise(r => setTimeout(r, 12000));
procs = (await j(base + "/api/processes", { headers: h })).list || [];
console.log("after:", JSON.stringify(procs.map(p => ({ pid: p.pid, injected: p.injected, uin: p.uin, status: p.status }))));
console.log("qq-list:", JSON.stringify(await j(base + "/api/qq-list", { headers: h })));