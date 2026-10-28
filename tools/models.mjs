import { NodeApiClient } from "file:///G:/dsh/qqbot/qq-bridge/src/dsh-client.js";
const c = new NodeApiClient("http://127.0.0.1:14476", 20000, { token: "" });
for (const args of [{ sessionId: "session-9f975a13-346a-4eba-b516-6eecd9aa5adb" }, {}]) {
  try {
    const r = await c.callUnary("session/modelCatalog", args, undefined);
    console.log(JSON.stringify(r).slice(0, 2500));
  } catch (e) { console.log("ERR", e?.message); }
}