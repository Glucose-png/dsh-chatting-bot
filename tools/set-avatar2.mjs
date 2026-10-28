const r = await fetch("http://127.0.0.1:3000/set_qq_avatar", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ file: "G:/dsh/qqbot/assets/deepseek-girl-avatar.png" }),
});
console.log("set:", r.status, (await r.text()).slice(0, 200));
await new Promise(r => setTimeout(r, 2500));