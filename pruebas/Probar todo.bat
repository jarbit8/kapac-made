@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python -X utf8 pruebas\probar_todo.py %*
set CODIGO=%ERRORLEVEL%
echo.
pause
exit /b %CODIGO%
