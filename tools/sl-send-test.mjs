const r = await fetch("http://127.0.0.1:3000/send_private_msg", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ user_id: 100000000, message: "机器人上线了，回我一句试试？" }),
});
console.log(r.status, (await r.text()).slice(0, 400));