// 只读干跑：拉热门 + 排行 + 推荐，去重后打印候选清单（不发任何东西）
import { popular, ranking, recommend } from './lib.mjs';

const seen = new Set();
const rows = [];
function push(list, src) {
  for (const v of list) {
    if (!v.bvid || seen.has(v.bvid)) continue;
    seen.add(v.bvid);
    rows.push({ ...v, src });
  }
}

push(await popular(20, 1), '热门');
push(await ranking(0), '排行');
for (let i = 0; i < 2; i++) {
  try {
    push(await recommend(i * 3), '推荐');
  } catch (e) {
    console.log('[warn] 推荐流失败：' + e.message);
  }
}

const fmt = (n) => (n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n ?? 0));
console.log(`候选总数 ${rows.length}`);
for (const [i, v] of rows.entries()) {
  const mins = Math.floor((v.duration || 0) / 60);
  console.log(
    `${String(i + 1).padStart(2)}. [${v.src}] ${v.title} | up=${v.owner} | ${fmt(v.view)}播放 ${fmt(v.like)}赞 ${fmt(v.reply)}评 | ${mins}分 | ${v.bvid} | ${v.tname}`,
  );
}
