const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const r = await fetch("http://127.0.0.1:3100/api/mode", {
  method: "POST",
  headers: { "content-type": "application/json", "x-console-token": tok },
  body: JSON.stringify({ mode: "closed-agent" }),
});
console.log("mode:", r.status, (await r.text()).slice(0, 300));
await new Promise(r => setTimeout(r, 6000));
const s = await (await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } })).json();
console.log("now:", s.mode, "dshReady:", s.dshReady, "preset:", s.closedAgentPreset || "(DSH 默认)");