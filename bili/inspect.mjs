// 取候选视频的详情 + 简介 + 热评，供人工/模型判断
import { videoInfo, replySample } from './lib.mjs';

const bvids = process.argv.slice(2);
for (const bvid of bvids) {
  try {
    const info = await videoInfo(bvid);
    console.log('='.repeat(70));
    console.log(`${info.title}`);
    console.log(`UP=${info.owner} | 分区=${info.tname} | ${Math.floor(info.duration / 60)}分 | 播放${info.view} 赞${info.like}`);
    console.log(`https://www.bilibili.com/video/${bvid}`);
    console.log('--- 简介 ---');
    console.log((info.desc || '(空)').slice(0, 900));
    const reps = await replySample(info.aid, 8);
    console.log('--- 热评样本 ---');
    for (const r of reps.slice(0, 6)) console.log(`[${r.like}赞] ${r.member}: ${String(r.message).slice(0, 160)}`);
  } catch (e) {
    console.log(`${bvid} 失败：${e.message}`);
  }
}
