const base = "http://127.0.0.1:5099";
const j = async (u, o) => (await fetch(u, o)).json();
const login = await j(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) });
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
let procs = (await j(base + "/api/processes", { headers: h })).list || [];
console.log("before:", JSON.stringify(procs.map(p => ({ pid: p.pid, injected: p.injected, connected: p.connected, loggedIn: p.loggedIn, uin: p.uin, status: p.status }))));
const targets = procs.filter(p => !p.injected && p.status === "available");
for (const p of targets) {
  const r = await fetch(base + "/api/processes/" + p.pid + "/load", { method: "POST", headers: h, body: "{}" });
  console.log("inject", p.pid, r.status, (await r.text()).slice(0, 200));
}
await new Promise(r => setTimeout(r, 12000));
procs = (await j(base + "/api/processes", { headers: h })).list || [];
console.log("after:", JSON.stringify(procs.map(p => ({ pid: p.pid, injected: p.injected, connected: p.connected, uin: p.uin, status: p.status }))));
const q = await j(base + "/api/qq-list", { headers: h });
console.log("qq-list:", JSON.stringify(q));