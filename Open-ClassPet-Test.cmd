@echo off
setlocal
set "APP_DIR=%~dp0electron-app"
set "ELECTRON=%APP_DIR%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON%" (
  echo Electron is not installed. Run npm.cmd ci in electron-app first.
  pause
  exit /b 1
)
start "Class Pet Layout A Test" "%ELECTRON%" "%APP_DIR%\scripts\start-layout-test.cjs"
endlocal
