const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } })).json();
console.log(JSON.stringify({ mode: s.mode, dshReady: s.dshReady, snowluma: s.snowluma?.connected, accountOnline: s.snowluma?.accountOnline }, null, 1));
const set = await fetch("http://127.0.0.1:3100/api/mode", { method: "POST", headers: { "content-type": "application/json", "x-console-token": tok }, body: JSON.stringify({ mode: "closed-agent" }) });
console.log("set:", set.status, (await set.text()).slice(0, 140));