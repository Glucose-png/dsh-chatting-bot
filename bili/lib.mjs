// B 站最小客户端：cookie 管理 / WBI 签名 / 热门·排行·推荐 / 视频详情 / 评论 / 发评论（含 @）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STATE_DIR = path.join(__dirname, 'state');
export const COOKIE_FILE = path.join(STATE_DIR, 'cookies.json');
export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export function loadCookies() {
  if (!fs.existsSync(COOKIE_FILE)) throw new Error('未登录：缺少 ' + COOKIE_FILE);
  const j = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
  return j.cookies || {};
}

export function cookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export function saveCookies(cookies) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(COOKIE_FILE, JSON.stringify({ savedAt: new Date().toISOString(), cookies }, null, 2), 'utf8');
}

export async function getJSON(url, { params, cookies, referer = 'https://www.bilibili.com/' } = {}) {
  const u = new URL(url);
  if (params) for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const ck = cookieHeader(cookies ?? loadCookies());
  const r = await fetch(u, {
    headers: { 'User-Agent': UA, Referer: referer, Origin: 'https://www.bilibili.com', Cookie: ck },
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`非 JSON 响应 ${r.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

export async function postForm(url, form, { cookies, referer } = {}) {
  const ck = cookieHeader(cookies ?? loadCookies());
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) if (v !== undefined && v !== null) body.set(k, String(v));
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      Referer: referer || 'https://www.bilibili.com/',
      Origin: 'https://www.bilibili.com',
      Cookie: ck,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`非 JSON 响应 ${r.status}: ${text.slice(0, 200)}`);
  }
}

// ---------- WBI 签名 ----------
const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function getMixinKey(orig) {
  return mixinKeyEncTab
    .map((n) => orig[n])
    .join('')
    .slice(0, 32);
}

let _wbiCache = { key: null, at: 0 };

export async function getWbiKeys(cookies) {
  if (_wbiCache.key && Date.now() - _wbiCache.at < 3600_000) return _wbiCache.key;
  const j = await getJSON('https://api.bilibili.com/x/web-interface/nav', { cookies });
  const img = j?.data?.wbi_img?.img_url || '';
  const sub = j?.data?.wbi_img?.sub_url || '';
  const pick = (u) => u.slice(u.lastIndexOf('/') + 1, u.lastIndexOf('.'));
  const raw = pick(img) + pick(sub);
  const key = raw.length >= 64 ? getMixinKey(raw) : null;
  if (!key) throw new Error('WBI key 获取失败');
  _wbiCache = { key, at: Date.now() };
  return key;
}

export async function wbiSignedParams(params, cookies) {
  const mixin = await getWbiKeys(cookies);
  const wts = Math.floor(Date.now() / 1000);
  const all = { ...params, wts };
  const query = Object.keys(all)
    .sort()
    .map((k) => {
      const v = String(all[k]).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .join('&');
  const w_rid = crypto.createHash('md5').update(query + mixin).digest('hex');
  return { ...all, w_rid };
}

// ---------- 内容源 ----------
export async function popular(pageSize = 20, pn = 1, cookies) {
  const j = await getJSON('https://api.bilibili.com/x/web-interface/popular', {
    params: { ps: pageSize, pn },
    cookies,
  });
  return (j.data?.list || []).map(normalize);
}

export async function ranking(rid = 0, cookies) {
  const j = await getJSON('https://api.bilibili.com/x/web-interface/ranking/v2', {
    params: { rid, type: 'all' },
    cookies,
  });
  return (j.data?.list || []).map(normalize);
}

export async function recommend(freshIdx = 0, cookies) {
  const params = await wbiSignedParams(
    { fresh_type: 3, ps: 12, fresh_idx: freshIdx, fresh_idx_1h: freshIdx, brush: freshIdx === 0 ? 0 : 1 },
    cookies,
  );
  const j = await getJSON('https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd', { params, cookies });
  const list = j?.data?.item || [];
  return list.filter((x) => x.goto === 'av' || x.bvid).map(normalize);
}

export async function videoInfo(bvid, cookies) {
  const view = await getJSON('https://api.bilibili.com/x/web-interface/view', { params: { bvid }, cookies });
  if (view.code !== 0) throw new Error('视频信息失败：' + view.message);
  const d = view.data;
  return {
    bvid,
    aid: d.aid,
    title: d.title,
    desc: d.desc,
    owner: d.owner?.name,
    ownerMid: d.owner?.mid,
    duration: d.duration,
    view: d.stat?.view,
    like: d.stat?.like,
    pubdate: d.pubdate,
    tname: d.tname,
  };
}

// 取视频评论样本（用来判断话题氛围、避免重复内容）
export async function replySample(oid, ps = 20, cookies) {
  const j = await getJSON('https://api.bilibili.com/x/v2/reply', {
    params: { type: 1, oid, ps, pn: 1, sort: 2 },
    cookies,
  });
  return (j.data?.replies || []).map((r) => ({ like: r.like, member: r.member?.uname, message: r.content?.message }));
}

function normalize(v) {
  const stat = v.stat || {};
  return {
    bvid: v.bvid,
    aid: v.aid,
    title: v.title,
    desc: v.desc || '',
    owner: v.owner?.name,
    ownerMid: v.owner?.mid,
    tname: v.tname || v.rcmd_reason_style?.tag?.text || '',
    duration: v.duration,
    view: stat.view ?? v.stat?.view ?? 0,
    like: stat.like ?? 0,
    reply: stat.reply ?? v.stat?.reply ?? 0,
    pubdate: v.pubdate,
    url: 'https://www.bilibili.com/video/' + v.bvid,
  };
}

// ---------- 发评论 ----------
export async function postReply({ oid, message, atNameToMid, cookies, root, parent, plat = 1 }) {
  const ck = cookies ?? loadCookies();
  const form = {
    type: 1,
    oid,
    message,
    csrf: ck.bili_jct,
    plat,
    ...(root ? { root, parent: parent ?? root } : {}),
    ...(atNameToMid && Object.keys(atNameToMid).length ? { at_name_to_mid: JSON.stringify(atNameToMid) } : {}),
  };
  return postForm('https://api.bilibili.com/x/v2/reply/add', form, { cookies: ck, referer: `https://www.bilibili.com/video/av${oid}` });
}
