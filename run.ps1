# Sonsus Engine - Windows 11 PowerShell Başlatıcı
[CmdletBinding()]
param (
    [switch]$Dev,
    [switch]$Build
)

Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ⚡ Sonsus Engine - Windows 11 PowerShell Launcher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# MinGW GCC & Cargo / Rust PATH Entegrasyonu
$mingwPath = "C:\Users\kayra\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
if (Test-Path $mingwPath) {
    if ($env:PATH -notlike "*$mingwPath*") {
        $env:PATH = "$mingwPath;" + $env:PATH
    }
}
if (Test-Path "$env:USERPROFILE\.cargo\bin") {
    if ($env:PATH -notlike "*$env:USERPROFILE\.cargo\bin*") {
        $env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH
    }
}

# 1. Node.js & npm Kontrolü
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[HATA] Node.js bulunamadı! Lütfen kurun: winget install OpenJS.NodeJS" -ForegroundColor Red
    Read-Host "Devam etmek için Enter'a basın..."
    exit 1
}

# 2. Rust / Cargo Kontrolü
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "[UYARI] Cargo / Rust henüz sistem PATH'inde tanımlı değil." -ForegroundColor Yellow
    Write-Host "Rustup kurmak için: winget install Rustlang.Rustup" -ForegroundColor DarkGray
}

# 3. NPM Paketleri
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] İlk çalıştırma: Bağımlılıklar yükleniyor (npm install)..." -ForegroundColor Yellow
    npm install
}

# 4. Mod Kontrolü
if ($Dev) {
    Write-Host "[*] Sonsus Engine Geliştirici Modunda başlatılıyor..." -ForegroundColor Green
    npm run tauri dev
    exit 0
}

if ($Build) {
    Write-Host "[*] Sonsus Engine Release derleniyor..." -ForegroundColor Green
    npm run build
    cargo build --release --manifest-path src-tauri/Cargo.toml
    if (Test-Path "src-tauri\target\release\sonsus-engine.exe") {
        Start-Process "src-tauri\target\release\sonsus-engine.exe"
    }
    exit 0
}

# 5. Mevcut Binary veya Dev
if (Test-Path "src-tauri\target\release\sonsus-engine.exe") {
    Write-Host "[*] Sonsus Engine Release sürümü açılıyor..." -ForegroundColor Green
    Start-Process "src-tauri\target\release\sonsus-engine.exe"
} else {
    Write-Host "[*] Sonsus Engine Geliştirici Modunda (tauri dev) başlatılıyor..." -ForegroundColor Green
    npm run tauri dev
}
