@echo off
rem Guarda la llave secreta nueva de Culqi en Secret Manager y vuelve a subir las funciones con ella
call "%~dp0_entorno.bat"
if not defined FB (echo No se encontro la CLI de Firebase. Instalala con: npm install -g firebase-tools & pause & exit /b 1)
echo.
echo Pega la llave SECRETA nueva de Culqi (empieza con sk_live_) y presiona Enter. No se ve mientras la escribes.
echo Si pregunta si quieres volver a desplegar las funciones, responde N: este .bat lo hace despues.
echo.
rem Firebase anota lo que manda (incluida la clave) en firebase-debug.log mientras corre:
rem se hace en una carpeta temporal y ese archivo se borra siempre, salga bien o mal
set "TMPCLAVE=%TEMP%\kapac-clave"
mkdir "%TMPCLAVE%" 2>nul
pushd "%TMPCLAVE%"
call "%FB%" functions:secrets:set CULQI_SECRET_KEY --project kapac-made
set RESULTADO=%errorlevel%
del /q "%TMPCLAVE%\firebase-debug.log" 2>nul
popd
rmdir /q "%TMPCLAVE%" 2>nul
if not "%RESULTADO%"=="0" (echo No se guardo la llave. & pause & exit /b 1)
call "%~dp0Publicar funciones.bat"
call "%FB%" functions:secrets:prune --force --project kapac-made
del /q "%~dp0..\firebase-debug.log" 2>nul
echo.
echo Si Culqi tambien cambio la llave PUBLICA (pk_live_), hay que cambiarla en frontend\src\pages\PagoCulqi.jsx y publicar la web.
pause
