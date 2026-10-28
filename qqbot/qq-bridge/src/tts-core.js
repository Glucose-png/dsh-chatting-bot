// 本机 TTS 合成（GPT-SoVITS api_v2，默认 http://127.0.0.1:9880）。
//
// 设计要点：
// - 合成出来的 wav 直接写进「语音库」目录（默认 audio/tts/），这样后续发送仍复用
//   qq-bridge 已有的语音发送链路（sendVoiceForV2），不必给 QQ 侧再加一条发送通道。
// - 只做「文本 → wav 文件」，不碰 QQ API；失败一律抛 Error，由调用方决定回给模型什么。
// - 所有敏感项（模型占用、显存是否够）都不在这里判断：start-tts.ps1 那边负责。
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const TTS_DEFAULTS = {
  enabled: false,
  // GPT-SoVITS api_v2 的地址
  apiBase: 'http://127.0.0.1:9880',
  // 参考音频：高松灯（羊宫妃那）台词切片，相对仓库根目录或绝对路径
  refAudioPath: 'tts/assets/cand/c.wav',
  promptText: 'それは、前の前の前の先輩。前の部長さんは最後の方、どんな星だったんだろう。',
  promptLang: 'ja',
  // 合成文本语言：QQ 里说的是中文，所以默认 zh（跨语种克隆，音色仍然按参考音频走）
  textLang: 'zh',
  speed: 1.0,
  // 单次合成字数上限（超过就截断，避免一条语音几分钟）
  maxChars: 120,
  // 合成超时（秒级推理，8GB 显存上一句话通常 1~5 秒）
  timeoutMs: 180000,
  // 生成的 wav 落在语音库下的哪个子目录
  subDir: 'tts',
  // 保留最近多少个合成文件（防止语音库无限膨胀）
  keepFiles: 40,
  // 生成后是否顺手做一次响度/音量处理（交给 voice 配置的 ffmpeg 链路）
  sampleSteps: null,
  // 服务没在跑时，是否自动调用 startScript 拉起来（省得主人每次手动开）
  autoStart: true,
  // 启动脚本（相对仓库根目录或绝对路径）
  startScript: 'tts/start-tts.ps1'
};

export function normalizeTtsConfig(raw, { root }) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const cfg = { ...TTS_DEFAULTS, ...src };
  const ref = String(cfg.refAudioPath ?? '').trim();
  return {
    enabled: cfg.enabled === true,
    apiBase: String(cfg.apiBase || TTS_DEFAULTS.apiBase).replace(/\/+$/, ''),
    refAudioPath: ref ? (path.isAbsolute(ref) ? ref : path.resolve(root, ref)) : '',
    promptText: String(cfg.promptText ?? ''),
    promptLang: String(cfg.promptLang || 'ja').toLowerCase(),
    textLang: String(cfg.textLang || 'zh').toLowerCase(),
    speed: Number(cfg.speed) > 0 ? Number(cfg.speed) : 1,
    maxChars: Number(cfg.maxChars) > 0 ? Number(cfg.maxChars) : TTS_DEFAULTS.maxChars,
    timeoutMs: Number(cfg.timeoutMs) > 0 ? Number(cfg.timeoutMs) : TTS_DEFAULTS.timeoutMs,
    subDir: String(cfg.subDir || TTS_DEFAULTS.subDir).replace(/^[\\/]+|[\\/]+$/g, ''),
    keepFiles: Number(cfg.keepFiles) >= 0 ? Number(cfg.keepFiles) : TTS_DEFAULTS.keepFiles,
    sampleSteps: Number(cfg.sampleSteps) > 0 ? Number(cfg.sampleSteps) : null,
    autoStart: cfg.autoStart !== false,
    startScript: (() => {
      const p = String(cfg.startScript || TTS_DEFAULTS.startScript).trim();
      return p ? (path.isAbsolute(p) ? p : path.resolve(root, '..', '..', p)) : '';
    })()
  };
}

/** 把文本整理成适合合成的样子：去换行/多余空白，限长。 */
export function prepareText(input, maxChars = TTS_DEFAULTS.maxChars) {
  let s = String(input ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '，')
    .trim();
  // GPT-SoVITS 不支持 emoji / 部分符号，先剔掉，避免合成出怪音
  s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '');
  if (s.length > maxChars) s = s.slice(0, maxChars);
  return s;
}

/** 探活：GPT-SoVITS 是否在跑（任何 HTTP 响应都算活着）。 */
export async function ttsAlive(ttsCfg) {
  const base = ttsCfg?.apiBase;
  if (!base) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${base}/docs`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * 真正「能不能出声」的探针：端口通了不代表权重加载完（api_v2 的 uvicorn 会先起来），
 * 所以这里发一句最短的合成请求，能回 200 才算就绪。
 */
async function probeReady(ttsCfg, { timeoutMs = 150000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ttsCfg.apiBase}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: '嗯',
        text_lang: ttsCfg.textLang,
        ref_audio_path: ttsCfg.refAudioPath,
        prompt_text: ttsCfg.promptText,
        prompt_lang: ttsCfg.promptLang,
        text_split_method: 'cut5',
        batch_size: 1,
        media_type: 'wav',
        streaming_mode: false
      }),
      signal: ctrl.signal
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1000;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 服务没在跑时顺手拉起来：后台 spawn 启动脚本（自带模型加载与预热），
 * 然后轮询端口直到通，最后再真合成一句确认权重已经加载完。
 * 并发调用时外部应自行去重（bridge 里做了 single-flight）。
 * @returns {Promise<{ok:boolean, started:boolean, error?:string, waitedMs?:number}>}
 */
export async function ensureTtsRunning(ttsCfg, { timeoutMs = 240000, pollMs = 3000, log = () => {} } = {}) {
  if (await ttsAlive(ttsCfg)) {
    // 服务本来就开着：可能是主人手动起的，也可能还没加载完，探一下再决定。
    if (await probeReady(ttsCfg, { timeoutMs: Math.min(timeoutMs, 60000) })) return { ok: true, started: false };
  }
  if (ttsCfg?.autoStart === false) {
    return { ok: false, started: false, error: 'TTS 服务未运行（socialV2.tts.autoStart=false，需手动启动）' };
  }
  const script = ttsCfg?.startScript;
  if (!script || !fs.existsSync(script)) {
    return { ok: false, started: false, error: `TTS 服务未运行，且找不到启动脚本：${script || '(未配置)'}` };
  }

  log(`TTS 服务未就绪，正在后台启动：${script}`);
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script],
    { windowsHide: true, stdio: 'ignore', detached: false }
  );
  child.on('error', (error) => log(`TTS 启动脚本报错：${error?.message ?? error}`));
  child.unref?.();

  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    if (!(await ttsAlive(ttsCfg))) continue;
    // 端口通了还要等权重加载 + 预热（start-tts.ps1 自己也会跑两遍预热）。
    if (await probeReady(ttsCfg, { timeoutMs: Math.max(15000, timeoutMs - (Date.now() - t0)) })) {
      return { ok: true, started: true, waitedMs: Date.now() - t0 };
    }
  }
  return {
    ok: false,
    started: true,
    waitedMs: Date.now() - t0,
    error: `TTS 服务启动超时（${Math.round(timeoutMs / 1000)}s），看 tts/api.err.log`
  };
}

async function readErrorBody(res) {
  try {
    const txt = await res.text();
    try {
      const j = JSON.parse(txt);
      return j.Exception || j.message || txt.slice(0, 300);
    } catch {
      return txt.slice(0, 300);
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * 合成一段语音并写到语音库目录。
 * @returns {Promise<{file:string, relName:string, bytes:number}>}
 */
export async function synthesizeToLibrary(text, { ttsCfg, voiceDir }) {
  if (!ttsCfg?.enabled) throw new Error('TTS 未启用（socialV2.tts.enabled=false）');
  if (!ttsCfg.refAudioPath || !fs.existsSync(ttsCfg.refAudioPath)) {
    throw new Error('参考音频不存在：检查 socialV2.tts.refAudioPath');
  }
  const say = prepareText(text, ttsCfg.maxChars);
  if (!say) throw new Error('合成文本为空');

  const payload = {
    text: say,
    text_lang: ttsCfg.textLang,
    ref_audio_path: ttsCfg.refAudioPath,
    prompt_text: ttsCfg.promptText,
    prompt_lang: ttsCfg.promptLang,
    text_split_method: 'cut5',
    batch_size: 1,
    speed_factor: ttsCfg.speed,
    media_type: 'wav',
    streaming_mode: false
  };
  if (ttsCfg.sampleSteps) payload.sample_steps = ttsCfg.sampleSteps;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ttsCfg.timeoutMs);
  let res;
  try {
    res = await fetch(`${ttsCfg.apiBase}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') throw new Error(`TTS 合成超时（${Math.round(ttsCfg.timeoutMs / 1000)}s）`);
    throw new Error(`连不上 TTS 服务（${ttsCfg.apiBase}）：先启动 GPT-SoVITS api_v2`);
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error(`TTS 合成失败：${await readErrorBody(res)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error('TTS 返回的音频过小，可能合成失败');

  const dir = path.resolve(voiceDir, ttsCfg.subDir || 'tts');
  await fsp.mkdir(dir, { recursive: true });
  const name = `tomori-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.wav`;
  const file = path.join(dir, name);
  await fsp.writeFile(file, buf);

  // 顺手清理旧文件（按 mtime 保最新 keepFiles 个）
  try {
    if (ttsCfg.keepFiles > 0) {
      const files = (await fsp.readdir(dir))
        .filter((f) => f.toLowerCase().endsWith('.wav'))
        .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      for (const old of files.slice(ttsCfg.keepFiles)) {
        try { fs.unlinkSync(path.join(dir, old.f)); } catch {}
      }
    }
  } catch {}

  return {
    file,
    relName: path.relative(voiceDir, file).split(path.sep).join('/'),
    bytes: buf.length,
    text: say
  };
}
