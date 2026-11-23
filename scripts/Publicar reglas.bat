@echo off
rem Sube las reglas de seguridad de Firestore (firestore.rules)
call "%~dp0_entorno.bat"
if not defined FB (echo No se encontro la CLI de Firebase. Instalala con: npm install -g firebase-tools & pause & exit /b 1)
cd /d "%~dp0.."
call "%FB%" deploy --only firestore:rules --project kapac-made
set RESULTADO=%errorlevel%
del /q firebase-debug.log 2>nul
echo.
if not "%RESULTADO%"=="0" (echo Algo fallo: revisa el mensaje de arriba.) else (echo Listo. Ya puedes cerrar esta ventana.)
pause
