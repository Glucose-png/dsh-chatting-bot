@echo off
chcp 65001 >nul
title QQ 机器人控制台
cd /d "%~dp0qqbot\panel"
echo 正在启动控制台（浏览器会自动打开 http://127.0.0.1:3200）...
echo 关闭此窗口 = 停止机器人与桥接。
echo.
"%~dp0SnowLuma\app\node.exe" server.mjs
echo.
echo 控制台已退出。
pause