// 自检：评论里 @ 人是否生效（发完查回帖内容，再删）
import { videoInfo, postReply, getJSON, loadCookies, postForm } from './lib.mjs';

const bvid = process.argv[2] || 'BV1Z6H56oEcQ';
const TARGET_MID = 433900835;
const TARGET_NAME = '穹的亚匹';

const info = await videoInfo(bvid);
console.log(`视频：${info.title} aid=${info.aid}`);

const text = `@${TARGET_NAME} 测试艾特，马上删除。`;
const res = await postReply({ oid: info.aid, message: text, atNameToMid: { [TARGET_NAME]: TARGET_MID } });
console.log('发送：' + JSON.stringify({ code: res.code, message: res.message, rpid: res?.data?.rpid }));
const rpid = res?.data?.rpid;
if (!rpid) process.exit(2);

await new Promise((r) => setTimeout(r, 2500));

let found = null;
for (let pn = 1; pn <= 3 && !found; pn++) {
  const j = await getJSON('https://api.bilibili.com/x/v2/reply', { params: { type: 1, oid: info.aid, ps: 20, pn, sort: 0 } });
  found = (j.data?.replies || []).find((r) => String(r.rpid) === String(rpid));
}
if (!found) {
  console.log('查不到刚发的评论（可能被折叠/延迟）');
} else {
  const c = found.content || {};
  console.log('正文=' + JSON.stringify(c.message));
  console.log('members=' + JSON.stringify(c.members || []));
  console.log('是否含目标UID=' + JSON.stringify((c.members || []).some((m) => String(m.mid) === String(TARGET_MID))));
}

const ck = loadCookies();
const del = await postForm('https://api.bilibili.com/x/v2/reply/del', { type: 1, oid: info.aid, rpid, csrf: ck.bili_jct });
console.log('删除：' + JSON.stringify(del));
