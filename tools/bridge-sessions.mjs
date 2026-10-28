const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const h = { "x-console-token": tok };
for (const p of ["/api/sessions", "/api/pending"]) {
  try {
    const r = await fetch("http://127.0.0.1:3100" + p, { headers: h });
    console.log(p, r.status, (await r.text()).slice(0, 800));
  } catch (e) { console.log(p, "ERR", e.message); }
}
const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: h })).json();
console.log("activity tail:", String(s.activity || "").split("\n").slice(-5).join("\n"));