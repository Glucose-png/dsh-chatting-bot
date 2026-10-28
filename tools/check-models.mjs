const p = await (await fetch("http://127.0.0.1:3200/api/state")).json();
console.log("模型数量:", (p.choices?.models || []).length);
console.log("前 4 个:", (p.choices?.models || []).slice(0, 4).map(m => m.provider + "/" + m.model).join(" | "));
console.log("当前:", p.model?.provider + "/" + p.model?.model);
console.log("账号:", JSON.stringify(p.account));