@echo off
setlocal
cd /d "%~dp0electron-app"
start "Class Pet Teacher Preview" node_modules\electron\dist\electron.exe scripts\open-teacher-preview.cjs
endlocal
