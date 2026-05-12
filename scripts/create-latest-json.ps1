$ErrorActionPreference = "Stop"

$repo = "ABC-xiaoxuan/Tolist2.0"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Join-Path $root "src-tauri\tauri.conf.json"
$bundleDir = Join-Path $root "src-tauri\target\release\bundle"
$nsisDir = Join-Path $bundleDir "nsis"

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$version = $config.version
$tag = "v$version"
$notesPath = Join-Path $root "release-notes\$tag.md"
$releaseNotes = if (Test-Path $notesPath) {
  (Get-Content $notesPath -Raw -Encoding UTF8).Trim()
} else {
  "ToList Desktop $version"
}
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
  notes = $releaseNotes
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = [ordered]@{
    "windows-x86_64" = [ordered]@{
      signature = $signature
      url = "https://github.com/$repo/releases/latest/download/$githubInstallerName"
    }
  }
}

$latestPath = Join-Path $bundleDir "latest.json"
$latestJson = $latest | ConvertTo-Json -Depth 8
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($latestPath, $latestJson, $utf8NoBom)
Write-Host "Generated $latestPath"
