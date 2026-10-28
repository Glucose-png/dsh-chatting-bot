const r = await fetch("http://127.0.0.1:3200/api/restart", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
console.log("restart:", r.status, await r.text());