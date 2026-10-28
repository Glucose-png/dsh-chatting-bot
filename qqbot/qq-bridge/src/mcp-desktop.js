// 桌面控制 MCP server（stdio）。给 closed-agent（仅主人私聊）用的执行类工具面。
//
// 设计边界：
// - 只注册在 profile 的全局 MCP 层；qq-chat* preset 的执行期白名单只放行
//   mcp__snowluma__ / mcp__snowluma-host__ / mcp__web-search-safe__，
//   所以这些 mcp__desktop__* 工具在群聊 preset 里根本不可见，只有 closed-agent 能用。
// - 不提供任意命令执行（DSH 自带 pwsh），这里只做「桌面/应用」这一层：
//   看窗口、开应用、聚焦、剪贴板、截图、按键、媒体键、系统信息。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'desktop-control', version: '1.0.0' });

// 统一走 PowerShell：强制 UTF-8 输出，避免中文窗口标题变乱码。
function ps(script, timeoutMs = 25000) {
  const wrapped = `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $ErrorActionPreference='Stop'; ${script}`;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', wrapped], {
      windowsHide: true
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, timeoutMs);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out: out.trim(), err: err.trim() }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, out: '', err: String(e?.message ?? e) }); });
  });
}

function text(t) { return { content: [{ type: 'text', text: String(t) }] }; }
function fail(t) { return { content: [{ type: 'text', text: String(t) }], isError: true }; }

// 常用应用别名：模型说「打开微信」时不用猜路径
const APP_ALIASES = {
  微信: 'WeChat.exe', wechat: 'WeChat.exe', 企业微信: 'WXWork.exe',
  qq: 'QQ.exe', QQ: 'QQ.exe',
  浏览器: 'msedge.exe', 浏览器edge: 'msedge.exe', edge: 'msedge.exe', chrome: 'chrome.exe', 谷歌: 'chrome.exe',
  记事本: 'notepad.exe', notepad: 'notepad.exe',
  计算器: 'calc.exe', calc: 'calc.exe',
  画图: 'mspaint.exe', paint: 'mspaint.exe',
  任务管理器: 'taskmgr.exe', 资源管理器: 'explorer.exe', 文件管理器: 'explorer.exe',
  终端: 'wt.exe', 命令行: 'cmd.exe', powershell: 'powershell.exe',
  vscode: 'Code.exe', 代码: 'Code.exe',
  设置: 'ms-settings:'
};

server.tool(
  'pc_info',
  '查看本机状态：系统版本、CPU/内存占用、磁盘剩余、开机时长、当前用户。',
  {},
  async () => {
    const { code, out, err } = await ps(`
      $os = Get-CimInstance Win32_OperatingSystem
      $cs = Get-CimInstance Win32_ComputerSystem
      $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
      $disk = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object {
        "{0}: 剩余 {1:N1} GB / 共 {2:N1} GB" -f $_.Name, (($_.Free)/1GB), ((($_.Used + $_.Free))/1GB)
      }
      $up = (Get-Date) - $os.LastBootUpTime
      "系统: $($os.Caption) $($os.Version)"
      "计算机: $($cs.Name)  用户: $env:USERNAME"
      "CPU 占用: $([math]::Round($cpu,1))%"
      "内存: 已用 {0:N1} GB / 共 {1:N1} GB" -f (($os.TotalVisibleMemorySize - $os.FreePhysicalMemory)/1MB), ($os.TotalVisibleMemorySize/1MB)
      "开机时长: {0} 天 {1} 小时 {2} 分" -f $up.Days, $up.Hours, $up.Minutes
      $disk
    `);
    return code === 0 ? text(out) : fail(`查询失败：${err || out}`);
  }
);

server.tool(
  'pc_windows',
  '列出当前有窗口的程序（进程名 + 窗口标题 + PID）。找窗口、判断某个应用是否开着时用。',
  { limit: z.number().optional().describe('最多返回多少条，默认 40') },
  async ({ limit }) => {
    const n = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const { code, out, err } = await ps(`
      Get-Process | Where-Object { $_.MainWindowTitle -ne '' } |
        Sort-Object -Property @{Expression={$_.MainWindowTitle}} |
        Select-Object -First ${n} |
        ForEach-Object { "{0} | {1} | PID={2}" -f $_.ProcessName, $_.MainWindowTitle, $_.Id }
    `);
    return code === 0 ? text(out || '（当前没有带窗口的进程）') : fail(`列出失败：${err || out}`);
  }
);

server.tool(
  'pc_open',
  '打开一个应用、文件、文件夹或网址。target 可以是常用别名（微信/QQ/edge/记事本/计算器/设置…）、可执行文件名、绝对路径，或 http(s) 链接。',
  { target: z.string().min(1).describe('别名 / 程序名 / 路径 / URL') },
  async ({ target }) => {
    const raw = String(target).trim();
    const alias = APP_ALIASES[raw] || APP_ALIASES[raw.toLowerCase()];
    const resolved = alias || raw;
    const quoted = resolved.replace(/'/g, "''");
    const { code, out, err } = await ps(`
      if (Test-Path -LiteralPath '${quoted}') { Start-Process -LiteralPath '${quoted}'; '已打开路径 ${quoted}' }
      else { Start-Process '${quoted}'; '已启动 ${quoted}' }
    `, 15000);
    if (code !== 0) return fail(`打开失败（${resolved}）：${err || out}`);
    return text(out || `已启动 ${resolved}`);
  }
);

server.tool(
  'pc_focus',
  '把某个窗口切到前台。title 传窗口标题的一部分即可（可从 pc_windows 获取）。',
  { title: z.string().min(1).describe('窗口标题关键字') },
  async ({ title }) => {
    const t = String(title).replace(/'/g, "''");
    const { code, out, err } = await ps(`
      $p = Get-Process | Where-Object { $_.MainWindowTitle -like '*${t}*' } | Select-Object -First 1
      if (-not $p) { 'NOTFOUND'; exit 3 }
      $ws = New-Object -ComObject WScript.Shell
      $ok = $ws.AppActivate($p.Id)
      if ($ok) { "已切到：$($p.MainWindowTitle)" } else { 'FOCUSFAIL'; exit 4 }
    `, 15000);
    if (code === 3) return fail(`没找到标题包含「${title}」的窗口`);
    if (code !== 0) return fail(`切换失败：${err || out}`);
    return text(out);
  }
);

server.tool(
  'pc_clipboard',
  '读或写系统剪贴板。action=get 返回当前内容；action=set 写入 text。',
  {
    action: z.enum(['get', 'set']).describe('get 读取 / set 写入'),
    text: z.string().optional().describe('action=set 时要写入的内容')
  },
  async ({ action, text: value }) => {
    if (action === 'get') {
      const { code, out, err } = await ps('Get-Clipboard -Raw', 12000);
      if (code !== 0) return fail(`读取失败：${err || out}`);
      return text(out || '（剪贴板为空）');
    }
    if (value === undefined) return fail('action=set 需要 text');
    const b64 = Buffer.from(String(value), 'utf8').toString('base64');
    const { code, out, err } = await ps(`
      $t = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}'))
      Set-Clipboard -Value $t
      '已写入剪贴板（{0} 字符）' -f $t.Length
    `, 12000);
    return code === 0 ? text(out) : fail(`写入失败：${err || out}`);
  }
);

server.tool(
  'pc_screenshot',
  '截屏（全部屏幕），图片会直接返回给你看。用于确认界面状态、找按钮位置、看报错弹窗。',
  {},
  async () => {
    const file = path.join(os.tmpdir(), `dsh-shot-${Date.now()}.png`);
    const p = file.replace(/\\/g, '/');
    const { code, out, err } = await ps(`
      Add-Type -AssemblyName System.Windows.Forms, System.Drawing
      $b = [System.Windows.Forms.SystemInformation]::VirtualScreen
      $bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
      $g = [System.Drawing.Graphics]::FromImage($bmp)
      $g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
      $bmp.Save('${p}', [System.Drawing.Imaging.ImageFormat]::Png)
      $g.Dispose(); $bmp.Dispose()
      "OK $($b.Width)x$($b.Height)"
    `, 30000);
    if (code !== 0 || !fs.existsSync(file)) return fail(`截屏失败：${err || out}`);
    const buf = fs.readFileSync(file);
    try { fs.unlinkSync(file); } catch {}
    if (buf.length > 3.5 * 1024 * 1024) return fail(`截图过大（${(buf.length / 1048576).toFixed(1)}MB），屏幕分辨率太高，先缩小窗口或用 pc_windows 描述`);
    return {
      content: [
        { type: 'text', text: `截图 ${out}（${(buf.length / 1024).toFixed(0)}KB）` },
        { type: 'image', data: buf.toString('base64'), mimeType: 'image/png' }
      ]
    };
  }
);

server.tool(
  'pc_keys',
  '向当前前台窗口发送按键（SendKeys 语法），例如 "^{s}" 保存、"^c" 复制、"{ENTER}"、"Hello"。执行前请先 pc_focus 到目标窗口。',
  { keys: z.string().min(1).describe('SendKeys 按键串') },
  async ({ keys }) => {
    const k = String(keys).replace(/'/g, "''");
    const { code, out, err } = await ps(`
      $ws = New-Object -ComObject WScript.Shell
      $ws.SendKeys('${k}')
      '已发送按键：${k}'
    `, 12000);
    return code === 0 ? text(out) : fail(`发送失败：${err || out}`);
  }
);

server.tool(
  'pc_media',
  '媒体与音量控制：playpause / next / prev / mute / volup / voldown。',
  { action: z.enum(['playpause', 'next', 'prev', 'mute', 'volup', 'voldown']) },
  async ({ action }) => {
    const map = { playpause: '0xB3', next: '0xB0', prev: '0xB1', mute: '0xAD', volup: '0xAF', voldown: '0xAE' };
    const vk = map[action];
    const { code, out, err } = await ps(`
      Add-Type -Namespace W -Name K -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);'
      [W.K]::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero)
      [W.K]::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero)
      '已执行 ${action}'
    `, 12000);
    return code === 0 ? text(out) : fail(`执行失败：${err || out}`);
  }
);

// 自检：node mcp-desktop.js --selftest
if (process.argv.includes('--selftest')) {
  const info = await ps('(Get-Date).ToString("yyyy-MM-dd HH:mm:ss") + " PowerShell OK"');
  console.log('[selftest] powershell:', info.code === 0 ? info.out : info.err);
  const wins = await ps(`Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -First 5 | ForEach-Object { "{0} | {1}" -f $_.ProcessName, $_.MainWindowTitle }`);
  console.log('[selftest] windows:', wins.code === 0 ? wins.out : wins.err);
  process.exit(0);
}

await server.connect(new StdioServerTransport());