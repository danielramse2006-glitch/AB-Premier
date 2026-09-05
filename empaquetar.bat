@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title AB Premiere - Empaquetador

echo [1/4] Buscando Python 3.12...
set "PYTHON_EXE="
py -3.12 -c "import sys; assert sys.version_info[:2] == (3,12)" >nul 2>nul && set "PYTHON_EXE=py -3.12"
if not defined PYTHON_EXE if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not defined PYTHON_EXE if exist "C:\Python312\python.exe" set "PYTHON_EXE=C:\Python312\python.exe"
if not defined PYTHON_EXE goto :python_error

echo [2/4] Preparando entorno compatible...
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info[:2] == (3,12) else 1)" >nul 2>nul
    if errorlevel 1 (
        echo El entorno anterior usa otra version de Python. Se recreara.
        rmdir /s /q ".venv"
    )
)
if not exist ".venv\Scripts\python.exe" %PYTHON_EXE% -m venv ".venv"
if errorlevel 1 goto :venv_error
set "VENV_PY=%CD%\.venv\Scripts\python.exe"

echo [3/4] Instalando dependencias...
"%VENV_PY%" -m pip install --upgrade pip
if errorlevel 1 goto :pip_error
"%VENV_PY%" -m pip install --only-binary=:all: -r requirements.txt
if errorlevel 1 goto :pip_error

echo [4/4] Generando AB Premiere.exe...
"%VENV_PY%" -m PyInstaller --noconfirm --clean --onefile --windowed --name "AB Premiere" --add-data "templates;templates" --add-data "static;static" --hidden-import waitress --hidden-import webview --hidden-import openpyxl app.py
if errorlevel 1 goto :build_error

echo.
echo ==================================================
echo LISTO: dist\AB Premiere.exe
echo ==================================================
pause
exit /b 0

:python_error
echo.
echo ERROR: Python 3.12 no esta instalado.
echo Python 3.15 no es compatible con este empaquetado.
echo Instala Python 3.12 de 64 bits y marca "Add Python to PATH".
echo https://www.python.org/downloads/release/python-31210/
pause
exit /b 1

:venv_error
echo ERROR: No se pudo crear el entorno virtual.
pause
exit /b 1

:pip_error
echo ERROR: No se pudieron instalar las dependencias. No se genero ningun EXE.
pause
exit /b 1

:build_error
echo ERROR: PyInstaller no pudo generar el ejecutable.
pause
exit /b 1
