const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
const before = await (await fetch(base + "/api/processes", { headers: h })).json();
console.log("before:", JSON.stringify(before.list.map(x => ({ pid: x.pid, inj: x.injected, status: x.status }))));
const target = before.list.find(x => !x.injected && x.status === "available") || before.list[0];
if (target) {
  const r = await fetch(base + `/api/processes/${target.pid}/load`, { method: "POST", headers: h, body: "{}" });
  console.log("load", target.pid, r.status, (await r.text()).slice(0, 300));
}
await new Promise(r => setTimeout(r, 5000));
console.log("after:", JSON.stringify(await (await fetch(base + "/api/processes", { headers: h })).json()));
console.log("qq-list:", JSON.stringify(await (await fetch(base + "/api/qq-list", { headers: h })).json()));