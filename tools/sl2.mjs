const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
const p = await (await fetch(base + "/api/processes", { headers: h })).json();
console.log("processes:", JSON.stringify(p, null, 1));
const sys = await (await fetch(base + "/api/system", { headers: h })).json();
console.log("system:", JSON.stringify(sys).slice(0, 600));