// B 站扫码登录：生成二维码 → 轮询 → 保存完整 cookie（SESSDATA / bili_jct / DedeUserID）
// 用法：node login.mjs [--login-only]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, 'state');
const COOKIE_FILE = path.join(STATE_DIR, 'cookies.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

fs.mkdirSync(STATE_DIR, { recursive: true });

const headersFor = () => ({
  'User-Agent': UA,
  Referer: 'https://www.bilibili.com/',
  Origin: 'https://www.bilibili.com',
});

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function generate() {
  const r = await fetch('https://passport.bilibili.com/x/passport-login/web/qrcode/generate?source=main-fe-header', {
    headers: headersFor(),
  });
  const j = await r.json();
  if (j.code !== 0) throw new Error('生成二维码失败：' + JSON.stringify(j));
  return { url: j.data.url, key: j.data.qrcode_key };
}

async function poll(key) {
  const r = await fetch(
    `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${encodeURIComponent(key)}&source=main-fe-header`,
    { headers: headersFor() },
  );
  const setCookies = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  const j = await r.json();
  return { data: j, setCookies };
}

function parseCookies(setCookies, jar) {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    const idx = first.indexOf('=');
    if (idx > 0) {
      const name = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      if (name) jar[name] = value;
    }
  }
  return jar;
}

async function main() {
  const jar = {};
  const { url, key } = await generate();

  // 终端二维码（用 qrcode-terminal，若不可用则只给 URL）
  let rendered = false;
  try {
    const mod = await import('qrcode-terminal');
    const qrcode = mod.default ?? mod;
    qrcode.generate(url, { small: true });
    rendered = true;
  } catch (e) {
    console.log('[warn] 终端二维码渲染失败：' + e.message);
  }
  console.log('QR_URL=' + url);
  console.log('QR_KEY=' + key);
  if (!rendered) console.log('（请用上面的 QR_URL 自己生成二维码）');

  const deadline = Date.now() + 600000;
  let lastCode = null;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    let res;
    try {
      res = await poll(key);
    } catch (e) {
      console.log('[poll] 网络错误：' + e.message);
      continue;
    }
    const { data, setCookies } = res;
    const code = data?.data?.code ?? data?.code;
    if (code !== lastCode) {
      console.log(`[poll] code=${code} msg=${data?.data?.message ?? data?.message ?? ''}`);
      lastCode = code;
    }
    if (code === 86101) continue; // 未扫码
    if (code === 86090) continue; // 已扫码，待确认
    if (code === 86038) throw new Error('二维码已失效，请重新运行');
    if (code === 0) {
      parseCookies(setCookies, jar);
      // 登录成功时 data.url 里也带了一份 cookie 参数，兜底解析
      try {
        const u = new URL(data.data.url);
        for (const [k, v] of u.searchParams.entries()) {
          if (!jar[k]) jar[k] = v;
        }
      } catch {}
      const need = ['SESSDATA', 'bili_jct', 'DedeUserID'];
      const missing = need.filter((n) => !jar[n]);
      fs.writeFileSync(COOKIE_FILE, JSON.stringify({ savedAt: new Date().toISOString(), cookies: jar }, null, 2), 'utf8');
      if (missing.length) throw new Error('登录成功但缺少 cookie：' + missing.join(','));
      console.log('LOGIN_OK uin=' + jar.DedeUserID);
      return;
    }
    throw new Error('登录失败：' + JSON.stringify(data));
  }
  throw new Error('等待超时（10 分钟）');
}

main().catch((e) => {
  console.error('LOGIN_FAIL ' + e.message);
  process.exit(1);
});
