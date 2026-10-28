const r = await fetch("http://127.0.0.1:3200/api/state");
const j = await r.json();
console.log("state", r.status, JSON.stringify({ dsh: j.dsh, sl: j.snowluma, br: j.bridge, mode: j.status?.mode, online: j.status?.snowluma?.accountOnline, model: j.model }).slice(0, 500));
const h = await fetch("http://127.0.0.1:3200/");
const t = await h.text();
console.log("html", h.status, t.length, t.includes("一键启动"));