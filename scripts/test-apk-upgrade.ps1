param(
  [string]$OldApk = (Join-Path $PSScriptRoot '..\小手机-v28-版本1.10-界面主题修复.apk'),
  [string]$NewApk = (Join-Path $PSScriptRoot '..\小手机-v29-版本1.11-生图TTS稳定版.apk'),
  [string]$PackageName = 'com.smallphone.app',
  [string]$Serial = '',
  [switch]$MetadataOnly
)

$ErrorActionPreference = 'Stop'
$sdk = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { 'C:\Android\Sdk' }
$adb = Join-Path $sdk 'platform-tools\adb.exe'
$aapt = Join-Path $sdk 'build-tools\36.0.0\aapt.exe'
$apksigner = Join-Path $sdk 'build-tools\36.0.0\apksigner.bat'

foreach ($path in @($OldApk, $NewApk, $adb, $aapt, $apksigner)) {
  if (!(Test-Path -LiteralPath $path)) { throw "Required file is missing: $path" }
}

function Read-ApkMetadata([string]$path) {
  $badgingLines = & $aapt dump badging $path
  if ($LASTEXITCODE -ne 0) { throw "aapt could not read $path" }
  $badging = $badgingLines | Select-Object -First 1
  $match = [regex]::Match($badging, "package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'")
  if (!$match.Success) { throw "APK package metadata is invalid: $path" }
  $certificate = (& $apksigner verify --print-certs $path | Select-String 'Signer #1 certificate SHA-256 digest:' | Select-Object -First 1).Line
  if (!$certificate) { throw "APK signature metadata is missing: $path" }
  [pscustomobject]@{
    Path = (Resolve-Path -LiteralPath $path).Path
    PackageName = $match.Groups[1].Value
    VersionCode = [int]$match.Groups[2].Value
    VersionName = $match.Groups[3].Value
    CertificateSha256 = ($certificate -split ':', 2)[1].Trim()
  }
}

$old = Read-ApkMetadata $OldApk
$new = Read-ApkMetadata $NewApk
if ($old.PackageName -ne $PackageName -or $new.PackageName -ne $PackageName) {
  throw "Package mismatch: old=$($old.PackageName), new=$($new.PackageName)"
}
if ($old.CertificateSha256 -ne $new.CertificateSha256) {
  throw 'The APK signing certificate changed; Android would reject an in-place upgrade.'
}
if ($new.VersionCode -le $old.VersionCode) {
  throw "New versionCode must be greater than old versionCode: $($old.VersionCode) -> $($new.VersionCode)"
}

Write-Output "Metadata OK: $PackageName $($old.VersionCode)/$($old.VersionName) -> $($new.VersionCode)/$($new.VersionName)"
Write-Output "Signing certificate SHA-256: $($new.CertificateSha256)"
if ($MetadataOnly) { exit 0 }

$adbArgs = if ($Serial) { @('-s', $Serial) } else { @() }
$devices = & $adb devices
$connected = @($devices | Select-String '\sdevice$')
if ($connected.Count -eq 0) {
  throw 'No Android device is connected. Start a rooted emulator or connect a test device, then rerun this script.'
}
if (!$Serial -and $connected.Count -gt 1) {
  throw 'More than one Android device is connected. Pass -Serial <adb-serial>.'
}

& $adb @adbArgs install -r $old.Path
if ($LASTEXITCODE -ne 0) { throw 'Installing the old APK failed.' }

& $adb @adbArgs root | Out-Null
& $adb @adbArgs wait-for-device | Out-Null
$uid = (& $adb @adbArgs shell id -u).Trim()
if ($uid -ne '0') {
  throw 'The connected device is not adb-root capable, so a reliable app-data sentinel cannot be created.'
}

$token = "xiaophone-upgrade-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
$sentinel = "/data/user/0/$PackageName/files/codex-upgrade-sentinel.txt"
& $adb @adbArgs shell "mkdir -p /data/user/0/$PackageName/files && printf '$token' > '$sentinel'"
if ($LASTEXITCODE -ne 0) { throw 'Creating the pre-upgrade data sentinel failed.' }

& $adb @adbArgs install -r $new.Path
if ($LASTEXITCODE -ne 0) { throw 'Installing the new APK as an upgrade failed.' }

$packageInfo = (& $adb @adbArgs shell dumpsys package $PackageName | Select-String 'versionCode=' | Select-Object -First 1).Line
if ($packageInfo -notmatch "versionCode=$($new.VersionCode)\b") {
  throw "The installed package is not versionCode $($new.VersionCode): $packageInfo"
}
$restoredToken = (& $adb @adbArgs shell "cat '$sentinel'").Trim()
if ($restoredToken -ne $token) {
  throw 'The app-data sentinel did not survive the APK upgrade.'
}

& $adb @adbArgs shell monkey -p $PackageName -c android.intent.category.LAUNCHER 1 | Out-Null
Write-Output "Upgrade OK: versionCode $($new.VersionCode) installed and app data survived."
