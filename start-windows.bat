@echo off
REM Dubbelklik dit bestand om Snowy Tracks lokaal te starten.
REM Vereist Node.js (https://nodejs.org - LTS-versie).

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is niet gevonden.
  echo Installeer eerst Node.js via https://nodejs.org en start dit bestand opnieuw.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Bezig met installeren van de benodigde pakketten. Dit duurt een minuut...
  call npm install || (echo Installatie mislukt. & pause & exit /b 1)
)

echo.
echo Snowy Tracks start op. Je browser opent zo vanzelf.
echo Sluit dit venster om de app te stoppen.
echo.
call npm run dev -- --open
pause
