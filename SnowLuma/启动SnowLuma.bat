@echo off
chcp 65001 >nul
cd /d "%~dp0app"
rem 面板密码不写死在脚本里：先设环境变量，再启动
rem   一次性设置：setx SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD 你的密码
if not defined SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD (
  set "SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD=change-me"
  echo [提示] 未检测到 SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD，本次使用默认密码 change-me
  echo        建议先执行：setx SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD 你的密码
)
echo ===============================================
echo  SnowLuma starting...
echo  WebUI: http://127.0.0.1:5099
echo  Password: %SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD%
echo  Keep this window open. Close = bot offline.
echo ===============================================
node.exe .\index.mjs
pause
