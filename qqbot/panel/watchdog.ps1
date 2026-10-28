# 鲸鱼 QQ 机器人体检 / 自愈
# 由计划任务 QQBotWatchdog（每 2 分钟）与 QQBotWatchdogLogon（登录时）调用。
# 目标：DSH 重启、QQ 重启、TTS 挂掉之后，QQ 机器人链路能自己回来，不用每天手动救。
#
# 链路：面板(3200) -> SnowLuma(5099) -> OneBot(3000/3001) -> 桥接(3100) -> DSH
#       语音另需 TTS(9880)
#
# 手动跑：powershell -NoProfile -ExecutionPolicy Bypass -File E:\dsh_chatting_bot\qqbot\panel\watchdog.ps1
param([switch]$Quiet)

$ErrorActionPreference = 'SilentlyContinue'
$root     = 'E:\dsh_chatting_bot'
$panelDir = Join-Path $root 'qqbot\panel'
$node     = Join-Path $root 'SnowLuma\app\node.exe'
$logPath  = Join-Path $panelDir 'watchdog.log'

function Write-Log([string]$msg) {
  if ($Quiet) { return }
  $line = "$(Get-Date -Format 'MM-dd HH:mm:ss') $msg"
  try { Add-Content -LiteralPath $logPath -Value $line -Encoding utf8 } catch {}
}

# 日志超过 512KB 就滚一份，避免无限长大
try {
  if ((Test-Path -LiteralPath $logPath) -and ((Get-Item -LiteralPath $logPath).Length -gt 512KB)) {
    Move-Item -LiteralPath $logPath -Destination "$logPath.1" -Force
  }
} catch {}

function Get-PortUp([int]$port) {
  $client = New-Object Net.Sockets.TcpClient
  try {
    $task = $client.ConnectAsync('127.0.0.1', $port)
    if ($task.Wait(500) -and $client.Connected) { return $true }
    return $false
  } catch { return $false } finally { $client.Close() }
}

$actions = @()

# ── 1. 面板：整条链的总管，挂了就重启它（由计划任务拉起 => 不随 DSH 退出） ──
if (-not (Get-PortUp 3200)) {
  Write-Log '面板(3200) 不在 -> 启动面板'
  Start-Process -FilePath $node -ArgumentList 'server.mjs' -WorkingDirectory $panelDir -WindowStyle Hidden
  $actions += 'panel'
  Start-Sleep -Seconds 8
}

# ── 2. 面板在、但 SnowLuma 或桥接不在 -> 让面板按自己的流程补拉（会顺带同步 DSH 端口） ──
if ((Get-PortUp 3200) -and ((-not (Get-PortUp 5099)) -or (-not (Get-PortUp 3100)))) {
  Write-Log 'SnowLuma/桥接 不在 -> POST /api/start'
  try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:3200/api/start' -Method Post -Body '{}' -ContentType 'application/json' -TimeoutSec 120 | Out-Null
    $actions += 'stack'
  } catch { Write-Log "  /api/start 失败：$($_.Exception.Message)" }
  Start-Sleep -Seconds 5
}

# ── 3. 桥接在跑但连不上 DSH（DSH 端口漂移） -> /api/fix-dsh 重新对齐 baseUrl ──
if ((Get-PortUp 3200) -and (Get-PortUp 3100)) {
  try {
    $state = Invoke-RestMethod -Uri 'http://127.0.0.1:3200/api/state' -TimeoutSec 15
    if ($state -and ($state.dsh -eq $false) -and $state.dshUrl) {
      Write-Log "桥接连不上 DSH（$($state.dshUrl)） -> /api/fix-dsh"
      Invoke-RestMethod -Uri 'http://127.0.0.1:3200/api/fix-dsh' -Method Post -Body '{}' -ContentType 'application/json' -TimeoutSec 60 | Out-Null
      $actions += 'dsh-port'
    }
  } catch { Write-Log "  状态查询失败：$($_.Exception.Message)" }
}

# ── 4. TTS（语音合成 9880）：挂了就后台拉起（启动约 60~90 秒，不等它） ──
if (-not (Get-PortUp 9880)) {
  Write-Log 'TTS(9880) 不在 -> 后台启动 start-tts.ps1'
  Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $root 'tts\start-tts.ps1')) `
    -WindowStyle Hidden
  $actions += 'tts'
}

if ($actions.Count -gt 0) { Write-Log ("本轮动作：" + ($actions -join ', ')) }
if (-not $Quiet) {
  $parts = @()
  foreach ($p in 3000, 3001, 3100, 3200, 5099, 9880) {
    if (Get-PortUp $p) { $parts += "$p=up" } else { $parts += "$p=DOWN" }
  }
  Write-Log ("状态：" + ($parts -join ' '))
}
