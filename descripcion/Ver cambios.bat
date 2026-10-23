@echo off
rem Vuelve a armar pedidos.html, visitas.html y reclamos.html con lo que dice textos-pedidos.json
cd /d "%~dp0"
node generar-vistas.js
if errorlevel 1 (pause & exit /b)
start "" "%~dp0pedidos.html"
