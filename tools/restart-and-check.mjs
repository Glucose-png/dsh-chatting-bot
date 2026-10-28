async function st() {
  const r = await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75" } });
  return r.json();
}
let s = await st();
console.log("before -> mode:", s.mode, "dshReady:", s.dshReady, "snowluma:", s.snowluma?.connected);
const r = await fetch("http://127.0.0.1:3200/api/restart", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("restart:", r.status);
await new Promise(r => setTimeout(r, 15000));
s = await st();
console.log("after  -> mode:", s.mode, "dshReady:", s.dshReady, "snowluma:", s.snowluma?.connected, "accountOnline:", s.snowluma?.accountOnline);