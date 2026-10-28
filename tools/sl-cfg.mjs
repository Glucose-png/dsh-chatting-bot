const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
const r = await fetch(base + "/api/config/3949453849", { headers: h });
console.log("status", r.status);
console.log(JSON.stringify(await r.json(), null, 1).slice(0, 4000));