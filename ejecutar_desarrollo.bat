@echo off
cd /d "%~dp0"
where py >nul 2>nul || (echo Instala Python 3 para continuar.& pause & exit /b 1)
if not exist ".venv\Scripts\python.exe" py -3 -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install -r requirements.txt
python app.py
