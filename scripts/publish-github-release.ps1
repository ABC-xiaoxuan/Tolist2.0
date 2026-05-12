param(
  [switch]$SkipBuild,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repo = "ABC-xiaoxuan/Tolist2.0"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Join-Path $root "src-tauri\tauri.conf.json"
$bundleDir = Join-Path $root "src-tauri\target\release\bundle"
$nsisDir = Join-Path $bundleDir "nsis"

if (!(Test-Path $configPath)) {
  throw "Tauri config not found: $configPath"
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$version = $config.version

if ([string]::IsNullOrWhiteSpace($version)) {
  throw "Unable to read version from $configPath"
}

$tag = "v$version"
$releaseTitle = $tag
$notesPath = Join-Path $root "release-notes\$tag.md"
$releaseNotes = if (Test-Path $notesPath) {
  (Get-Content $notesPath -Raw -Encoding UTF8).Trim()
} else {
  "ToList Desktop $version"
}

$installerName = "ToList Desktop_${version}_x64-setup.exe"
$installerPath = Join-Path $nsisDir $installerName
$signaturePath = "$installerPath.sig"
$githubInstallerName = $installerName -replace " ", "."
$githubInstallerPath = Join-Path $nsisDir $githubInstallerName
$githubSignaturePath = "$githubInstallerPath.sig"
$latestPath = Join-Path $bundleDir "latest.json"

function Invoke-Step {
  param(
    [string]$Message,
    [scriptblock]$Action
  )

  Write-Host "==> $Message"
  & $Action
}

function Assert-CommandSucceeded {
  param(
    [string]$Message
  )

  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

function Assert-PathExists {
  param(
    [string]$Path,
    [string]$Label
  )

  if (!(Test-Path $Path)) {
    throw "$Label not found: $Path"
  }
}

if (!$SkipBuild) {
  Invoke-Step "Building release bundle and updater manifest" {
    npm run release:windows
  }
  Assert-CommandSucceeded "Release build failed"
} else {
  Write-Host "==> Skipping build step"
}

Assert-PathExists -Path $installerPath -Label "Installer"
Assert-PathExists -Path $signaturePath -Label "Updater signature"
Assert-PathExists -Path $latestPath -Label "latest.json"

Invoke-Step "Preparing GitHub-friendly asset names" {
  Copy-Item $installerPath $githubInstallerPath -Force
  Copy-Item $signaturePath $githubSignaturePath -Force
}

$assets = @(
  $latestPath,
  $githubInstallerPath,
  $githubSignaturePath
)

Write-Host "==> Version: $version"
Write-Host "==> Tag: $tag"
Write-Host "==> Assets:"
$assets | ForEach-Object { Write-Host "    $_" }

if ($DryRun) {
  Write-Host "==> Dry run enabled, skipping GitHub Release upload"
  exit 0
}

Invoke-Step "Checking existing GitHub Release" {
  $script:releaseListJson = gh release list --repo $repo --limit 100 --json tagName
}
Assert-CommandSucceeded "Failed to fetch release list from GitHub"
$releaseList = $releaseListJson | ConvertFrom-Json
$releaseExists = @($releaseList.tagName) -contains $tag

if ($releaseExists) {
  Invoke-Step "Updating existing Release $tag" {
    gh release upload $tag $assets --repo $repo --clobber
  }
  Assert-CommandSucceeded "Failed to upload assets to existing release $tag"

  Invoke-Step "Refreshing Release metadata" {
    gh release edit $tag --repo $repo --title $releaseTitle --notes $releaseNotes --latest
  }
  Assert-CommandSucceeded "Failed to update release metadata for $tag"
} else {
  Invoke-Step "Creating Release $tag" {
    gh release create $tag $assets --repo $repo --title $releaseTitle --notes $releaseNotes --latest
  }
  Assert-CommandSucceeded "Failed to create release $tag"
}

Write-Host "==> GitHub Release published successfully: https://github.com/$repo/releases/tag/$tag"
