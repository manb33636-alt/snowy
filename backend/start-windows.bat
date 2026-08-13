@echo off
title Snowy Tracks - backend
REM Dubbelklik dit bestand om de Snowy_Tracks-backend te starten.
REM Vereist Python (https://python.org - vink bij installeren
REM "Add python.exe to PATH" aan).

cd /d "%~dp0"

echo ============================================
echo    Snowy Tracks backend wordt gestart...
echo ============================================
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python is niet gevonden op deze computer.
  echo.
  echo     Installeer Python via https://python.org/downloads
  echo     LET OP: vink tijdens het installeren onderaan
  echo     "Add python.exe to PATH" aan, anders werkt dit niet.
  echo     Start dit bestand daarna opnieuw.
  echo.
  pause
  exit /b 1
)

echo [1/4] Python gevonden.

if not exist ".venv" (
  echo [2/4] Eigen Python-omgeving aanmaken...
  python -m venv .venv
  if errorlevel 1 (
    echo [X] Aanmaken is mislukt.
    pause
    exit /b 1
  )
) else (
  echo [2/4] Python-omgeving staat al klaar.
)

if not exist ".venv\Lib\site-packages\fastapi" (
  echo [3/4] Onderdelen ophalen. Even geduld, dit duurt ongeveer een minuut...
  call .venv\Scripts\python.exe -m pip install --quiet --upgrade pip
  call .venv\Scripts\python.exe -m pip install -r requirements.txt
  if errorlevel 1 (
    echo.
    echo [X] Het ophalen van de onderdelen is mislukt.
    echo     Controleer je internetverbinding en probeer opnieuw.
    pause
    exit /b 1
  )
) else (
  echo [3/4] Onderdelen staan al klaar.
)

if not exist ".env" goto instellen
findstr /b /c:"APP_PASSWORD_HASH=" .env | findstr /v /c:"APP_PASSWORD_HASH=$" >nul 2>nul
if errorlevel 1 goto instellen
goto starten

:instellen
echo [4/4] Eerste keer: even je wachtwoord en sleutel instellen.
echo.
call .venv\Scripts\python.exe eerste-keer-instellen.py
if errorlevel 1 (
  echo [X] Instellen is niet afgerond.
  pause
  exit /b 1
)
echo.

:starten
echo.
echo ============================================
echo    De backend draait zo op:
echo    http://localhost:8000
echo.
echo    Uitproberen kan op:
echo    http://localhost:8000/docs
echo.
echo    LET OP: laat dit venster openstaan zolang
echo    je de backend gebruikt. Sluiten = gestopt.
echo ============================================
echo.

call .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

echo.
echo De backend is gestopt.
pause
