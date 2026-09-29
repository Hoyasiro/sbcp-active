@echo off
rem SBCP local launcher - double-click to start
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py serve_local.py
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python serve_local.py
  goto end
)
echo.
echo [ERROR] Python is not installed. See README section 4-1.
echo         https://www.python.org/downloads/
pause
:end
