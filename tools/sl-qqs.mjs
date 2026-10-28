const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token };
console.log("qq-list:", JSON.stringify(await (await fetch(base + "/api/qq-list", { headers: h })).json()));
const p = await (await fetch(base + "/api/processes", { headers: h })).json();
console.log("proc:", JSON.stringify(p.list.map(x => ({ pid: x.pid, loggedIn: x.loggedIn, uin: x.uin, status: x.status }))));