const c = (u, o={}) => fetch(u, o).then(async r => ({ s: r.status, t: (await r.text()).slice(0, 300) })).catch(e => ({ s: 0, t: String(e.cause?.code ?? e.message) }));
console.log("onebot login_info:", JSON.stringify(await c("http://127.0.0.1:3000/get_login_info", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })));
console.log("onebot get_status:", JSON.stringify(await c("http://127.0.0.1:3000/get_status", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })));
const login = await c("http://127.0.0.1:5099/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) });
console.log("snowluma login:", login.s);
let tok = ""; try { tok = JSON.parse(login.t).token ?? ""; } catch {}
if (tok) console.log("qq-list:", JSON.stringify(await c("http://127.0.0.1:5099/api/qq-list", { headers: { "x-snowluma-token": tok } })));
console.log("bridge status:", JSON.stringify(await c("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75" } })));