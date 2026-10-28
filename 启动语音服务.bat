@echo off
chcp 65001 >nul
title 小鲸鱼语音服务（高松灯音色）
echo 正在启动 TTS 服务（GPT-SoVITS · v2ProPlus · 高松灯音色）
echo 首次加载约 60 秒，之后每条语音 1-2 秒。
echo 关掉这个窗口不会停止服务；要停止请双击「停止语音服务.bat」。
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tts\start-tts.ps1"
echo.
pause
