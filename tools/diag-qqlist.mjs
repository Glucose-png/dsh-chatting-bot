async function j(u, o) { const r = await fetch(u, o); return { s: r.status, b: await r.text() }; }
const login = await j("http://127.0.0.1:5099/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: "change-me" }) });
const tok = JSON.parse(login.b).token;
console.log("login", login.s, "tok", tok ? tok.slice(0, 12) + "..." : "(none)");
for (let i = 1; i <= 3; i++) {
  const q = await j("http://127.0.0.1:5099/api/qq-list", { headers: { "x-snowluma-token": tok } });
  console.log("try" + i, q.s, q.b.slice(0, 200));
  await new Promise(r => setTimeout(r, 1500));
}
const p1 = await j("http://127.0.0.1:5099/api/processes", { headers: { "x-snowluma-token": tok } });
console.log("processes:", p1.s, p1.b.slice(0, 500));