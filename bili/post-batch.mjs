// 批量发评论（带 @）：node post-batch.mjs <稿件json> [间隔毫秒]
// 稿件格式：[{ "bvid": "...", "message": "...", "at": { "昵称": mid } }]
import fs from 'node:fs';
import path from 'node:path';
import { videoInfo, postReply } from './lib.mjs';
import { STATE_DIR } from './lib.mjs';

const file = process.argv[2];
const gapMs = Number(process.argv[3] || 90000);
if (!file || !fs.existsSync(file)) {
  console.error('用法：node post-batch.mjs <稿件json> [间隔毫秒]');
  process.exit(1);
}
const items = JSON.parse(fs.readFileSync(file, 'utf8'));
const logFile = path.join(STATE_DIR, 'posted.jsonl');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [i, item] of items.entries()) {
  try {
    const info = await videoInfo(item.bvid);
    const res = await postReply({ oid: info.aid, message: item.message, atNameToMid: item.at });
    const line = {
      at: new Date().toISOString(),
      bvid: item.bvid,
      aid: info.aid,
      title: info.title,
      code: res.code,
      message: res.message,
      rpid: res?.data?.rpid ?? null,
      text: item.message,
    };
    fs.appendFileSync(logFile, JSON.stringify(line) + '\n', 'utf8');
    console.log(`[${i + 1}/${items.length}] ${res.code === 0 ? 'OK' : 'FAIL'} ${res.message} | ${info.title} | rpid=${res?.data?.rpid ?? '-'}`);
  } catch (e) {
    console.log(`[${i + 1}/${items.length}] ERROR ${e.message}`);
    fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), bvid: item.bvid, error: e.message }) + '\n', 'utf8');
  }
  if (i < items.length - 1) {
    console.log(`  …等待 ${Math.round(gapMs / 1000)} 秒`);
    await sleep(gapMs);
  }
}
