@echo off
setlocal
cd /d "%~dp0"
title Nexus Breach

echo.
echo   NEXUS BREACH - LANCEMENT
echo   ------------------------------------
echo.

rem Le serveur fonctionne-t-il deja ?
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5050/' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo Le jeu est deja lance. Ouverture...
    start "" "http://localhost:5050"
    exit /b 0
)

rem Node.js disponible ?
where node >nul 2>&1
if not errorlevel 1 goto :node

rem Repli sur le .NET si Node est absent
where dotnet >nul 2>&1
if not errorlevel 1 goto :dotnet

echo   [ERREUR] Aucun lanceur disponible.
echo.
echo   Installe Node.js (https://nodejs.org) ou le SDK .NET 8,
echo   puis relance ce fichier.
echo.
pause
exit /b 1

:node
echo   Serveur Node.js demarre.
echo.
node "serveur.js"
goto :fin

:dotnet
echo   [INFO] Node.js absent, lancement via .NET...
echo.
dotnet run --configuration Release -- --no-browser
if errorlevel 1 (
    echo.
    echo   [ERREUR] Le SDK .NET semble incomplet.
    echo   Installe Node.js depuis https://nodejs.org pour jouer.
    echo.
    pause
    exit /b 1
)

:fin
echo.
echo   Serveur arrete.
pause
