const tok = "6d2c4fb9aaa0e284e08f6b99868650e2c083a8747dd50d75";
const r = await fetch("http://127.0.0.1:3100/api/status", { headers: { "x-console-token": tok } });
const j = await r.json();
console.log(Object.keys(j));
console.log(JSON.stringify(j).slice(0, 1800));