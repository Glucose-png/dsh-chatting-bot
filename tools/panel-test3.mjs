const s = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log("account:", JSON.stringify(s.account));
console.log("flags:", JSON.stringify({ dsh: s.dsh, sl: s.snowluma, br: s.bridge, mode: s.status?.mode }));
const h = await (await fetch("http://127.0.0.1:3200/")).text();
console.log("html len", h.length, "hasMismatch", h.includes("不是小号"));