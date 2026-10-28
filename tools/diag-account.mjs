const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } })).json();
console.log("bridge snowluma:", JSON.stringify(s.snowluma), "mode", s.mode);
const login = await (await fetch("http://127.0.0.1:5099/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) })).json();
const h = { "x-snowluma-token": login.token };
console.log("qq-list:", await (await fetch("http://127.0.0.1:5099/api/qq-list", { headers: h })).text());
console.log("procs:", await (await fetch("http://127.0.0.1:5099/api/processes", { headers: h })).text());