// 每日候选：抓热门/排行/推荐 → 去重 → 粗筛打分 → 输出候选清单
// 用法：node daily.mjs [--top 15]
import fs from 'node:fs';
import path from 'node:path';
import { popular, ranking, recommend, STATE_DIR } from './lib.mjs';

const TOP = Number((process.argv.find((a) => a.startsWith('--top=')) || '').split('=')[1] || 15);
const DAY = new Date().toISOString().slice(0, 10);
const OUT_DIR = path.join(STATE_DIR, 'daily');
fs.mkdirSync(OUT_DIR, { recursive: true });

// 已经发过评论的 BV，避免重复
const posted = new Set();
const postedFile = path.join(STATE_DIR, 'posted.jsonl');
if (fs.existsSync(postedFile)) {
  for (const line of fs.readFileSync(postedFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o.bvid && o.code === 0) posted.add(o.bvid);
    } catch {}
  }
}

// 分区白名单（有迁移价值的领域）与黑名单（娱乐向）
const GOOD = ['知识', '科普', '数码', '科技', '财经', '商业', '职场', '教育', '社会', '人文', '历史', '法律', '心理', '汽车', '运动', '出行', '美食', '生活', '校园', '技能', '编程', '设计', '科学'];
const BAD = ['鬼畜', '宅舞', '游戏', '电子竞技', '搞笑', '明星', '综艺', '影视', '番剧', '动画', '音乐', '舞蹈', '美妆', '穿搭', '宠物', '喵星人', '日常', 'GMV', '小剧场', '仿妆', '手工', '原创音乐', '乐评', '同人', '手机游戏', '单机游戏', '整活'];

function score(v) {
  let s = 0;
  const t = (v.title || '') + ' ' + (v.desc || '');
  const cat = v.tname || '';
  if (GOOD.some((g) => cat.includes(g))) s += 3;
  if (BAD.some((b) => cat.includes(b))) s -= 6;
  const dur = v.duration || 0;
  if (dur >= 300 && dur <= 3600) s += 2; // 5~60 分钟最适合承载信息
  else if (dur < 120) s -= 3; // 太短基本是娱乐
  if (v.view > 100000) s += 2;
  if (v.view > 500000) s += 1;
  if (v.reply > 500) s += 1;
  const likeRate = v.view ? v.like / v.view : 0;
  if (likeRate > 0.05) s += 2;
  // 干货/方法论类关键词
  const KEY = ['如何', '怎么', '为什么', '揭秘', '真相', '原理', '指南', '攻略', '分析', '复盘', '实测', '横评', '对比', '方法论', '思考', '认知', '赚钱', '搞钱', '副业', '投资', '理财', '商业', '行业', '趋势', '效率', '学习', '读书', '思维', '专业', '大学', '毕业', '就业', 'offer', '简历', '面试'];
  for (const k of KEY) if (t.includes(k)) s += 1;
  // 标题党/情绪向扣分
  for (const k of ['离谱', '笑死', '逆天', '爆笑', '沙雕', '整活', '挑战', '大肥鱼']) if (t.includes(k)) s -= 2;
  return s;
}

const seen = new Set();
const rows = [];
function push(list, src) {
  for (const v of list) {
    if (!v.bvid || seen.has(v.bvid) || posted.has(v.bvid)) continue;
    seen.add(v.bvid);
    rows.push({ ...v, src, score: score(v) });
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

rows.sort((a, b) => b.score - a.score);
const top = rows.slice(0, TOP);
fs.writeFileSync(path.join(OUT_DIR, `candidates-${DAY}.json`), JSON.stringify(top, null, 2), 'utf8');

const fmt = (n) => (n >= 1e8 ? (n / 1e8).toFixed(1) + '亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(n ?? 0));
console.log(`候选 ${rows.length} 条（已排除发过的 ${posted.size} 条），下面是最值得看的 ${top.length} 条：\n`);
for (const [i, v] of top.entries()) {
  const mins = Math.floor((v.duration || 0) / 60);
  console.log(`${String(i + 1).padStart(2)}. [${v.score}分·${v.src}] ${v.title}`);
  console.log(`    ${v.owner} | ${fmt(v.view)}播放 ${fmt(v.like)}赞 ${fmt(v.reply)}评 | ${mins}分 | ${v.tname || '未分区'} | ${v.bvid}`);
  if (v.desc) console.log(`    简介：${String(v.desc).replace(/\s+/g, ' ').slice(0, 120)}`);
  console.log('');
}
console.log(`清单已存：${path.join(OUT_DIR, `candidates-${DAY}.json`)}`);
