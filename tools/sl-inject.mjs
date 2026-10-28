const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
const r = await fetch(base + "/api/processes/26780/load", { method: "POST", headers: h, body: "{}" });
console.log("load:", r.status, (await r.text()).slice(0, 500));
await new Promise(r => setTimeout(r, 4000));
const p = await (await fetch(base + "/api/processes", { headers: h })).json();
console.log("processes:", JSON.stringify(p));