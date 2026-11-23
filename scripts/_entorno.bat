@echo off
rem Lo que necesitan los demas .bat: el certificado del antivirus (Avast revisa las conexiones
rem seguras y sin esto Node y gcloud no se conectan) y donde esta la CLI de Firebase
if exist "C:\ProgramData\Avast Software\Avast\wscert.pem" set "NODE_EXTRA_CA_CERTS=C:\ProgramData\Avast Software\Avast\wscert.pem"
if exist "%~dp0certificado\ca_todo.pem" set "CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE=%~dp0certificado\ca_todo.pem"
set "PYTHONIOENCODING=utf-8"
set "GC=%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
set "FB="
for /f "delims=" %%F in ('where firebase.cmd 2^>nul') do if not defined FB set "FB=%%F"
if not defined FB for /d %%D in ("%LOCALAPPDATA%\Packages\*") do if exist "%%D\LocalCache\Roaming\npm\firebase.cmd" set "FB=%%D\LocalCache\Roaming\npm\firebase.cmd"
exit /b 0
