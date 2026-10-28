const s = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log("account:", JSON.stringify(s.account));
console.log("snowluma:", s.snowluma, "bridge:", s.bridge, "dsh:", s.dsh, s.dshUrl);
console.log("logs.snowluma tail:", (s.logs?.snowluma || []).slice(-8).join("\n"));
console.log("logs.bridge tail:", (s.logs?.bridge || []).slice(-6).join("\n"));