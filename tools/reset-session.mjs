const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const h = { "content-type": "application/json", "x-console-token": tok };
const before = await (await fetch("http://127.0.0.1:3100/api/sessions", { headers: h })).json();
console.log("before:", JSON.stringify(before));
for (const s of before.sessions || []) {
  const r = await fetch("http://127.0.0.1:3100/api/session/reset", { method: "POST", headers: h, body: JSON.stringify({ key: s.key }) });
  console.log("reset", s.key, r.status, (await r.text()).slice(0, 120));
}
const after = await (await fetch("http://127.0.0.1:3100/api/sessions", { headers: h })).json();
console.log("after:", JSON.stringify(after));