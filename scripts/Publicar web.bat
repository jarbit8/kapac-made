@echo off
rem Compila la web y la publica en GitHub Pages (rama gh-pages). Antes conviene correr pruebas\Probar todo.bat
call "%~dp0_entorno.bat"
cd /d "%~dp0..\frontend"
call npm run build
if errorlevel 1 (echo. & echo Fallo la compilacion: revisa el mensaje de arriba. & pause & exit /b 1)
type nul > build\.nojekyll
rem --add deja los archivos de la version anterior: quien tenga la pagina en cache la sigue viendo con estilos
call npx gh-pages -d build --dotfiles --add
if errorlevel 1 (echo. & echo Fallo la publicacion: revisa el mensaje de arriba. & pause & exit /b 1)
echo.
echo Listo. En unos 10 minutos se ve en www.kapac-made.com (abrela en incognito).
echo Recuerda subir tambien el codigo: git push origin main
pause
