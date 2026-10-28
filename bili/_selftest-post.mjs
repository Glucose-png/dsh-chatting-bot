// 一次性自检：能不能发评论（发完立刻删），验证账号权限
import { videoInfo, postReply, getJSON, loadCookies } from './lib.mjs';

const bvid = process.argv[2] || 'BV1Z6H56oEcQ';
const info = await videoInfo(bvid);
console.log(`目标视频：${info.title} | aid=${info.aid} | up=${info.owner}`);

const text = '测试评论，马上删除，抱歉打扰。';
const res = await postReply({ oid: info.aid, message: text });
console.log('发评论返回：' + JSON.stringify(res).slice(0, 400));

const rpid = res?.data?.rpid;
if (!rpid) {
  console.log('RESULT=FAIL 无法发评论，账号权限或风控拦截');
  process.exit(2);
}

const ck = loadCookies();
const { postForm } = await import('./lib.mjs');
const del2 = await postForm('https://api.bilibili.com/x/v2/reply/del', {
  type: 1,
  oid: info.aid,
  rpid,
  csrf: ck.bili_jct,
});
console.log('删除返回：' + JSON.stringify(del2).slice(0, 300));
console.log(del2.code === 0 ? 'RESULT=OK 可发评论且能删除' : 'RESULT=WARN 发成功但删除失败');
