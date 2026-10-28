const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token };
const g = await (await fetch(base + "/api/global-config", { headers: h })).json();
console.log(JSON.stringify(g, null, 1).slice(0, 3000));