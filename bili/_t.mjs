const t0=Date.now();
console.log("start");
try {
  const r = await fetch("https://passport.bilibili.com/x/passport-login/web/qrcode/generate?source=main-fe-header", {headers:{"User-Agent":"Mozilla/5.0 Chrome/126.0.0.0","Referer":"https://www.bilibili.com/"}});
  console.log("status", r.status, "ms", Date.now()-t0);
  const j = await r.json(); console.log("code", j.code);
} catch(e) { console.log("ERR", e.name, e.message, "ms", Date.now()-t0); }
