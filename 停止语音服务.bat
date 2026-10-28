@echo off
chcp 65001 >nul
title 停止小鲸鱼语音服务
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tts\start-tts.ps1" -Stop
echo.
pause
