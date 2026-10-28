@echo off
chcp 65001 >nul
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $startup = [Environment]::GetFolderPath('Startup'); $lnk = $ws.CreateShortcut((Join-Path $startup 'QQ机器人控制台.lnk')); $lnk.TargetPath = '%~dp0启动QQ机器人.bat'; $lnk.WorkingDirectory = '%~dp0'; $lnk.WindowStyle = 7; $lnk.Description = 'QQ 机器人控制台（开机自启）'; $lnk.Save(); Write-Host ('已安装开机自启: ' + (Join-Path $startup 'QQ机器人控制台.lnk'))"
pause