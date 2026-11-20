@echo off
setlocal
set "APP_DIR=%~dp0electron-app"
set "ELECTRON=%APP_DIR%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON%" (
  echo Electron runtime is missing. Run npm.cmd ci in electron-app first.
  pause
  exit /b 1
)
set "CLASSPET_START_PAGE=v3_portal.html"
start "Class Pet V3 原型" "%ELECTRON%" "%APP_DIR%"
endlocal
