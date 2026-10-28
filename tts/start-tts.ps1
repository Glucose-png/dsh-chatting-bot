# 小鲸鱼 TTS 服务（GPT-SoVITS api_v2 · 高松灯音色）
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File E:\dsh_chatting_bot\tts\start-tts.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File E:\dsh_chatting_bot\tts\start-tts.ps1 -Stop
#
# 说明：
# - 必须在 GPT-SoVITS 仓库根目录启动（sv.py 用 cwd 拼 eres2net 权重路径）。
# - 首次启动要加载 ~4.5GB 权重，约 1 分钟；看到 "Uvicorn running on http://127.0.0.1:9880" 才算好。
# - 端口已被占用时不会重复启动，直接报"已在运行"。
param(
  [switch]$Stop,
  [int]$Port = 9880
)

$ErrorActionPreference = 'Stop'
$root = 'E:\dsh_chatting_bot\tts'
$repo = Join-Path $root 'GPT-SoVITS'
$python = Join-Path $root 'venv\Scripts\python.exe'
$config = 'GPT_SoVITS/configs/tts_infer_tomori.yaml'
$outLog = Join-Path $root 'api.out.log'
$errLog = Join-Path $root 'api.err.log'

function Test-Port {
  param([int]$p)
  try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect('127.0.0.1', $p)
    $c.Close()
    return $true
  } catch { return $false }
}

if ($Stop) {
  $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) { "TTS 未在运行（端口 $Port 空闲）"; exit 0 }
  foreach ($procId in ($conns.OwningProcess | Select-Object -Unique)) {
    try { Stop-Process -Id $procId -Force; "已停止进程 $procId" } catch { "停止进程 $procId 失败：$($_.Exception.Message)" }
  }
  exit 0
}

if (Test-Port $Port) { "TTS 已在运行：http://127.0.0.1:$Port（如需重启先加 -Stop）"; exit 0 }
if (-not (Test-Path $python)) { throw "找不到 venv python：$python" }
if (-not (Test-Path (Join-Path $repo $config))) { throw "找不到配置文件：$config" }

# 启动时清空旧日志，方便看这次加载有没有报错
Set-Content -Path $outLog -Value '' -Encoding utf8
Set-Content -Path $errLog -Value '' -Encoding utf8

$proc = Start-Process -FilePath $python `
  -ArgumentList @('api_v2.py', '-a', '127.0.0.1', '-p', "$Port", '-c', $config) `
  -WorkingDirectory $repo `
  -RedirectStandardOutput $outLog -RedirectStandardError $errLog `
  -WindowStyle Hidden -PassThru

"已启动 pid=$($proc.Id)，等待模型加载（约 60s）…"
$deadline = (Get-Date).AddSeconds(300)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 3
  if ($proc.HasExited) { "启动失败（退出码 $($proc.ExitCode)）。err.log 末尾："; Get-Content $errLog -Tail 20 -Encoding UTF8; exit 1 }
  if (Test-Port $Port) {
    Start-Sleep -Seconds 2
    "TTS 就绪：http://127.0.0.1:$Port"
    # 预热：第一次合成要建 CUDA graph + 首次 conv 选算法，约 5-10s；
    # 启动时先跑一句，之后每条消息都在 1-2s 内返回。
    $warmBody = @{
      text = '预热一下，让我先把模型和显存都跑热，这样正式说话的时候就不会卡了。'
      text_lang = 'zh'
      ref_audio_path = (Join-Path $root 'assets\cand\c.wav')
      prompt_text = 'それは、前の前の前の先輩。前の部長さんは最後の方、どんな星だったんだろう。'
      prompt_lang = 'ja'; media_type = 'wav'; streaming_mode = $false
      text_split_method = 'cut5'; batch_size = 4
    } | ConvertTo-Json -Compress
    $warmFile = Join-Path $env:TEMP 'dsh-tts-warmup.json'
    Set-Content -Path $warmFile -Value $warmBody -Encoding utf8
    try {
      $t0 = Get-Date
      # 两遍：第一遍吞掉首次 BERT/cuBLAS/CUDA graph 的一次性初始化（实测可达 20-40s），
      # 第二遍确认已经进入 1-2s 的常态速度。
      foreach ($round in 1..2) {
        & curl.exe -s -X POST "http://127.0.0.1:$Port/tts" -H 'Content-Type: application/json' --data-binary "@$warmFile" -o (Join-Path $env:TEMP 'dsh-tts-warmup.wav') | Out-Null
      }
      "预热完成（2 次，共 $([math]::Round(((Get-Date) - $t0).TotalSeconds,1))s）"
    } catch { "预热跳过：$($_.Exception.Message)" }
    exit 0
  }
}
"超时：5 分钟内端口未监听，请查看 $errLog"; exit 1
