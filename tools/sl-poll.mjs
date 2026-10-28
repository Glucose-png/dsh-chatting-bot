const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token };
for (let i = 0; i < 3; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const q = await (await fetch(base + "/api/qq-list", { headers: h })).json();
  const p = await (await fetch(base + "/api/processes", { headers: h })).json();
  console.log(i, "qq-list:", JSON.stringify(q), "proc:", JSON.stringify(p.list.map(x => ({ pid: x.pid, loggedIn: x.loggedIn, uin: x.uin, status: x.status }))));
}