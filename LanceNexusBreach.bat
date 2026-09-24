@echo off
setlocal
cd /d "%~dp0"
title Nexus Breach

where dotnet >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERREUR] Microsoft .NET est necessaire pour lancer Nexus Breach.
    echo Installe le SDK .NET 8 ou superieur, puis reessaie.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:5050/health' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo Nexus Breach est deja lance. Ouverture du jeu...
    start "" "http://localhost:5050"
    exit /b 0
)

echo.
echo   NEXUS BREACH - LANCEMENT AUTOMATIQUE
echo   ------------------------------------
echo.
echo Le navigateur va s'ouvrir automatiquement.
echo Pour arreter le serveur, ferme cette fenetre.
echo.
dotnet run --configuration Release
echo.
echo Le serveur Nexus Breach s'est arrete.
pause
