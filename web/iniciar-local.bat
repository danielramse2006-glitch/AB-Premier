@echo off
cd /d "%~dp0"
if not exist "tools\php83\php.exe" (
  echo No se encontro PHP portatil en tools\php83.
  pause
  exit /b 1
)
echo AB Premiere Web: http://127.0.0.1:8080
start "" "http://127.0.0.1:8080"
"tools\php83\php.exe" -c php.ini -S 127.0.0.1:8080 router.php
