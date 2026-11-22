@echo off
setlocal enabledelayedexpansion
title Sonsus Engine - Windows Launcher

cd /d "%~dp0"

echo ========================================================
echo   ⚡ Sonsus Engine - Windows 11 Launcher
echo ========================================================

:: MinGW GCC & Cargo / Rust PATH Entegrasyonu
if exist "C:\Users\kayra\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin\" (
    set "PATH=C:\Users\kayra\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;%PATH%"
)
if exist "%USERPROFILE%\.cargo\bin\" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

:: 1. Node.js ve npm kontrolü
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js sisteminizde kurulu degil!
    echo Lutfen https://nodejs.org adresinden Node.js kurun veya su komutu calistirin:
    echo winget install OpenJS.NodeJS
    pause
    exit /b 1
)

:: 2. Rust / Cargo kontrolü
where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [BILGI] Rust / Cargo henuz PATH ortam degiskeninde bulunamadi.
    echo Eger Rust kurulu degilse, kurmak icin:
    echo winget install Rustlang.Rustup
    echo Kurulumdan sonra komut satirini yeniden baslatin.
    echo.
)

:: 3. node_modules kontrolü
if not exist "node_modules\" (
    echo [*] Ilk calistirma: NPM bagimliliklari yukleniyor...
    call npm install
)

:: 4. Parametre Kontrolü
if "%1"=="--dev" (
    echo [*] Sonsus Engine Canli Gelistirme Modunda (tauri dev) baslatiliyor...
    npm run tauri dev
    goto :eof
)

if "%1"=="--build" (
    echo [*] Sonsus Engine Release Derleniyor...
    call npm run build
    cargo build --release --manifest-path src-tauri/Cargo.toml
    if exist "src-tauri\target\release\sonsus-engine.exe" (
        echo [*] Baslatiliyor...
        start "" "src-tauri\target\release\sonsus-engine.exe"
    )
    goto :eof
)

:: 5. Derlenmis release binary varsa calistir, yoksa dev modunu ac
if exist "src-tauri\target\release\sonsus-engine.exe" (
    echo [*] Sonsus Engine Release calistiriliyor...
    start "" "src-tauri\target\release\sonsus-engine.exe"
) else (
    echo [*] Sonsus Engine dev modunda baslatiliyor...
    npm run tauri dev
)
