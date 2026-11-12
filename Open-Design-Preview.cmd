@echo off
setlocal
set "APP_DIR=%~dp0electron-app"
set "ELECTRON=%APP_DIR%\node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON%" (
  echo Electron runtime is missing.
  pause
  exit /b 1
)
start "Class Pet Design Preview" "%ELECTRON%" "%APP_DIR%\scripts\open-design-preview.cjs"
endlocal
