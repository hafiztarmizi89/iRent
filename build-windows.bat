@echo off
cd /d "%~dp0"
call npm install && call npm run dist:win && explorer dist
pause
