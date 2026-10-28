const s = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log(JSON.stringify({ dsh: s.dsh, dshUrl: s.dshUrl, sl: s.snowluma, br: s.bridge, cfg: s.model?.dshBaseUrl }));
const h = await (await fetch("http://127.0.0.1:3200/")).text();
console.log("html", h.length, h.includes("同步 DSH 端口"), h.includes("端口已变"));