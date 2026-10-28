const post = async (p) => { const r = await fetch("http://127.0.0.1:3200" + p, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); return [r.status, await r.text()]; };
console.log("stop:", ...(await post("/api/stop")));
await new Promise(r => setTimeout(r, 1500));
console.log("start:", ...(await post("/api/start")));
await new Promise(r => setTimeout(r, 1500));
const s = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log("after:", JSON.stringify({ br: s.bridge, sl: s.snowluma, mode: s.status?.mode, online: s.status?.snowluma?.accountOnline }));