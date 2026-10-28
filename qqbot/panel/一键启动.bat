@echo off
setlocal

set "ROOT=E:\dsh_chatting_bot"
set "NODE=%ROOT%\SnowLuma\app\node.exe"
set "PANEL=%ROOT%\qqbot\panel"
set "TTS_PS=%ROOT%\tts\start-tts.ps1"

echo 正在启动 QQ 机器人...

:: 检查 QQ
tasklist /FI "IMAGENAME eq QQ.exe" 2>nul | findstr QQ.exe >nul
if %errorlevel% neq 0 (
  echo [警告] QQ 未运行，请先打开 QQ 并登录。
)

:: 检查面板
netstat -ano | findstr ":3200 LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo [面板已在运行]
) else (
  echo [启动面板]...
  start "" /min cmd /c "cd /d %PANEL% && %NODE% server.mjs"
  timeout /t 3 /nobreak >nul
)

:: 检查 TTS
netstat -ano | findstr ":9880 LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
  echo [TTS 已在运行]
) else (
  echo [启动 TTS]...
  start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%TTS_PS%"
)

echo [等待]...
timeout /t 12 /nobreak >nul

echo.
echo 端口状态：
for %%p in (3000 3001 3100 3200 5099 9880) do (
  netstat -ano | findstr ":%%p LISTENING" >nul 2>&1 && (
    echo   [OK]   %%p
  ) || (
    echo   [未启动] %%p
  )
)
echo.
echo 完成。
pause
