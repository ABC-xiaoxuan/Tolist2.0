$ErrorActionPreference = "Stop"

$repo = "ABC-xiaoxuan/Tolist2.0"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Join-Path $root "src-tauri\tauri.conf.json"
$bundleDir = Join-Path $root "src-tauri\target\release\bundle"
$nsisDir = Join-Path $bundleDir "nsis"

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$version = $config.version
$installerName = "ToList Desktop_${version}_x64-setup.exe"
$installerPath = Join-Path $nsisDir $installerName
$signaturePath = "$installerPath.sig"

if (!(Test-Path $installerPath)) {
  throw "Installer not found: $installerPath"
}

if (!(Test-Path $signaturePath)) {
  throw "Updater signature not found: $signaturePath"
}

$githubInstallerName = $installerName -replace " ", "."
$signature = (Get-Content $signaturePath -Raw).Trim()
$latest = [ordered]@{
  version = $version
  notes = "ToList Desktop $version"
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = [ordered]@{
    "windows-x86_64" = [ordered]@{
      signature = $signature
      url = "https://github.com/$repo/releases/latest/download/$githubInstallerName"
    }
  }
}

$latestPath = Join-Path $bundleDir "latest.json"
$latest | ConvertTo-Json -Depth 8 | Set-Content -Path $latestPath -Encoding UTF8
Write-Host "Generated $latestPath"
