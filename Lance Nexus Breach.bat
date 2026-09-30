@echo off
setlocal
cd /d "%~dp0"
title Nexus Breach

echo.
echo   NEXUS BREACH - LANCEMENT
echo   ------------------------------------
echo.

rem Un serveur est-il deja sur le port ?
set "PORT=5050"
set "AUTRE=0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:%PORT%/' -TimeoutSec 1 -ErrorAction Stop; if ($r.Content -match 'data-mode-id') { exit 0 } else { exit 3 } } catch { exit 1 }" >nul 2>&1
if errorlevel 3 (
    echo [ERREUR] Le port %PORT% est occupe par AUTRE version du jeu.
    echo.
    echo   Celle qui repond ne propose pas le mode DONJON : c'est la copie
    echo   de sauvegarde, dans :
    echo     C:\Users\aozaz\NexusBreach-depot-8917d1a
    echo.
    echo   Fermez la fenetre noire de l'autre serveur, puis relancez celui-ci.
    echo.
    pause
    exit /b 1
)
if not errorlevel 1 (
    echo Le bon jeu tourne deja. Ouverture...
    start "" "http://localhost:%PORT%"
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
echo   Dossier lance : %CD%
echo   Adresse       : http://localhost:%PORT%
echo.
echo   Si l'onglet affiche TANK et pas de mode DONJON, c'est l'autre copie :
echo   le port etait deja pris. Voir les messages ci-dessus.
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
