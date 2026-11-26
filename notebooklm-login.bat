@echo off
set "Path=%USERPROFILE%\.local\bin;%Path%"
"%USERPROFILE%\.local\bin\nlm.exe" login --storage protected
pause