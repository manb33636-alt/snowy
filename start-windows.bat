@echo off
title Snowy Tracks
REM Dubbelklik dit bestand om Snowy Tracks op je eigen pc te starten.
REM Vereist Node.js (https://nodejs.org - kies de LTS-versie).

cd /d "%~dp0"

echo ============================================
echo    Snowy Tracks wordt gestart...
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is niet gevonden op deze computer.
  echo.
  echo     Installeer Node.js via https://nodejs.org
  echo     Kies de knop met "LTS" erop, klik in de installatie
  echo     steeds op Next, en start dit bestand daarna opnieuw.
  echo.
  pause
  exit /b 1
)

echo [1/2] Node.js gevonden.

if not exist "node_modules" (
  echo [2/2] Eerste keer opstarten: onderdelen ophalen. Even geduld, dit
  echo       duurt ongeveer een minuut. Er komt veel tekst voorbij, dat hoort zo.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo [X] Het ophalen van de onderdelen is mislukt.
    echo     Controleer je internetverbinding en probeer het opnieuw.
    echo.
    pause
    exit /b 1
  )
) else (
  echo [2/2] Onderdelen staan al klaar.
)

echo.
echo ============================================
echo    Zo meteen opent je browser vanzelf op:
echo    http://localhost:5173
echo.
echo    Inloggen met wachtwoord: sneeuw123
echo.
echo    LET OP: laat dit venster openstaan zolang
echo    je de app gebruikt. Sluiten = app stopt.
echo ============================================
echo.

call npm run dev -- --port 5173 --open

echo.
echo De app is gestopt.
pause
