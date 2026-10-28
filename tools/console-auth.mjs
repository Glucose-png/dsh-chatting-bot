const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
for (const h of [{ "x-console-token": tok }, { authorization: "Bearer " + tok }, { cookie: "console_token=" + tok }]) {
  const r = await fetch("http://127.0.0.1:3100/api/status", { headers: h });
  const t = await r.text();
  console.log(JSON.stringify(h).slice(0, 30), r.status, t.slice(0, 160).replace(/\s+/g, " "));
}
const r2 = await fetch("http://127.0.0.1:3100/api/status?token=" + tok);
console.log("query", r2.status, (await r2.text()).slice(0, 160).replace(/\s+/g, " "));