const r = await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75" } });
const s = await r.json();
console.log(JSON.stringify({ mode: s.mode, dshReady: s.dshReady, snowluma: s.snowluma, account: s.account, activity: s.activity }, null, 1));