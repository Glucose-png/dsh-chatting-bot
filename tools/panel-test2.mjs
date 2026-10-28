const st = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log("state:", JSON.stringify({ dsh: st.dsh, sl: st.snowluma, br: st.bridge, online: st.status?.snowluma?.accountOnline }));
const r = await fetch("http://127.0.0.1:3200/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("account:", r.status, await r.text());