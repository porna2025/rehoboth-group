# ============================================================
# Rehoboth Group — Lancement Backend + Frontend + Mobile
# ============================================================
# Utilisation : Ouvrir PowerShell dans ce dossier, puis taper :
#   .\start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- Backend Django ---
$backendCmd = @"
Push-Location '$root\backend'
Write-Host '>>> Migration de la base de donnees...' -ForegroundColor Cyan
& '$root\backend\venv\Scripts\python.exe' manage.py migrate
Write-Host '>>> Demarrage du serveur Django sur http://localhost:8000' -ForegroundColor Green
& '$root\backend\venv\Scripts\python.exe' manage.py runserver 0.0.0.0:8000
"@

# --- Frontend Vite ---
$frontendCmd = @"
Push-Location '$root\frontend'
Write-Host '>>> Demarrage du serveur Vite sur http://localhost:5173' -ForegroundColor Green
npm run dev
"@

# Lancer chaque serveur dans une nouvelle fenetre PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

# --- Mobile Flutter ---
$mobileCmd = @"
Push-Location '$root\mobile'
Write-Host '>>> Demarrage de l''application Flutter (emulateur Android)' -ForegroundColor Green
flutter run
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $mobileCmd

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Frontend : http://localhost:5173" -ForegroundColor Yellow
Write-Host "  API Docs : http://localhost:8000/api/v1/" -ForegroundColor Yellow
Write-Host "  Mobile   : flutter run (emulateur/appareil)" -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
