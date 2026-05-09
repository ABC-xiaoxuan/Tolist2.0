$ErrorActionPreference = "Stop"

$privateKeyPath = Join-Path $PSScriptRoot "..\.tauri\updater.key"
if (!(Test-Path $privateKeyPath)) {
  throw "Updater private key not found: $privateKeyPath"
}

$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $privateKeyPath -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""

npm run tauri build
npm run release:manifest
