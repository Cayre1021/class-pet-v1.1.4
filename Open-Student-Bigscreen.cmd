@echo off
setlocal
set "APP_DIR=%~dp0electron-app"
set "ELECTRON=%APP_DIR%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON%" (
  echo Electron is not installed. Run npm.cmd ci in electron-app first.
  pause
  exit /b 1
)
set "CLASSPET_START_PAGE=display_bigscreen_touch_pro.html"
start "Class Pet 学生大屏" "%ELECTRON%" "%APP_DIR%\scripts\start-layout-test.cjs"
endlocal
