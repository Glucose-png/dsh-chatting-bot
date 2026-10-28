const base = "http://127.0.0.1:5099";
const login = await (await fetch(base + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token, "content-type": "application/json" };
const q = await (await fetch(base + "/api/qq-list", { headers: h })).json();
console.log("online:", JSON.stringify(q));
if (!q.list?.length) process.exit(1);
const r = await fetch("http://127.0.0.1:3000/set_qq_avatar", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ file: "G:/dsh/qqbot/assets/whale-girl.png" }),
});
console.log("set_qq_avatar:", r.status, (await r.text()).slice(0, 400));