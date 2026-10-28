const base = "http://127.0.0.1:5099";
const r = await fetch(base + "/api/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password: "change-me" }),
});
const j = await r.json();
console.log("login", r.status, JSON.stringify(j).slice(0, 300));
const token = j.token || j.data?.token || j.sessionToken;
if (!token) process.exit(1);
const h = { "x-snowluma-token": token };
for (const p of ["/api/status", "/api/agreements", "/api/connections", "/api/processes", "/api/qq-list"]) {
  const res = await fetch(base + p, { headers: h });
  const t = await res.text();
  console.log("===", p, res.status, t.slice(0, 700));
}