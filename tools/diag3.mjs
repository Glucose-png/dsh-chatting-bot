const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
try {
  const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } })).json();
  console.log(JSON.stringify({ mode: s.mode, dshReady: s.dshReady, snowluma: s.snowluma?.connected, accountOnline: s.snowluma?.accountOnline, activity: String(s.activity||"").split("\n").slice(-4) }, null, 1));
} catch (e) { console.log("bridge ERR:", e.message); }
try {
  const p = await (await fetch("http://127.0.0.1:3200/api/state")).json();
  console.log("panel:", JSON.stringify({ dsh: p.dsh, dshUrl: p.dshUrl, snowluma: p.snowluma, bridge: p.bridge, account: p.account }));
} catch (e) { console.log("panel ERR:", e.message); }