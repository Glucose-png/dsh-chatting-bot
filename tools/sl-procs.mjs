const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token };
const p = await (await fetch(base + "/api/processes", { headers: h })).json();
console.log("processes:", JSON.stringify(p.list ?? p).slice(0, 600));
const q = await (await fetch(base + "/api/qq-list", { headers: h })).json();
console.log("qq-list:", JSON.stringify(q).slice(0, 300));