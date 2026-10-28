import { NodeApiClient, unwrap } from "file:///G:/dsh/qqbot/qq-bridge/src/dsh-client.js";
const api = new NodeApiClient("http://127.0.0.1:6206", undefined, { allowRemote: false });
const r = await api.agentPresets.list({});
const data = unwrap(r, "agentPresets.list");
console.log(JSON.stringify(data, null, 1).slice(0, 4000));