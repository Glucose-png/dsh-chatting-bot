const r = await fetch("http://127.0.0.1:3200/api/state");
const s = await r.json();
console.log("account:", JSON.stringify(s.account));
console.log("bridge.snowluma:", JSON.stringify(s.status?.snowluma ?? null));