@echo off
chcp 65001 >nul
powershell -NoProfile -Command "$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'QQ机器人控制台.lnk'; if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Host '已取消开机自启' } else { Write-Host '本来就没装开机自启' }"
pause