const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
await new Promise(r => setTimeout(r, 10000));
const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } })).json();
console.log(JSON.stringify({ mode: s.mode, dshReady: s.dshReady, snowluma: s.snowluma?.connected, accountOnline: s.snowluma?.accountOnline, good: s.snowluma?.good }, null, 1));