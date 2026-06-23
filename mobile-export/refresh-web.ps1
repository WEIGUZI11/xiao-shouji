$ErrorActionPreference = "Stop"

$mobileRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $mobileRoot

Push-Location $projectRoot
npm run build -- --base=./
Pop-Location

$dist = Join-Path $projectRoot "dist"
$htmlPath = Join-Path $dist "index.html"
$assets = Join-Path $dist "assets"
$cssFile = Get-ChildItem -Path $assets -Filter "*.css" | Select-Object -First 1
$jsFile = Get-ChildItem -Path $assets -Filter "*.js" | Select-Object -First 1

$css = Get-Content -Path $cssFile.FullName -Raw -Encoding utf8
$js = Get-Content -Path $jsFile.FullName -Raw -Encoding utf8

function Resolve-PublicAssetPath([string]$assetRelative) {
  $assetClean = [Uri]::UnescapeDataString($assetRelative)
  if ($assetClean.Contains("?")) {
    $assetClean = $assetClean.Split("?")[0]
  }

  $assetPath = Join-Path $projectRoot "public"
  foreach ($part in ($assetClean -split "/")) {
    if ($part -and $part -ne "." -and $part -ne "..") {
      $assetPath = Join-Path $assetPath $part
    }
  }

  return $assetPath
}

# The APK WebView loads this HTML offline, so public theme assets must be embedded.
$css = [regex]::Replace($css, 'url\(([''"]?)(?:\.\./|\.\/|/)?(guofeng-[^''")]+)\1\)', {
  param($match)
  $assetPath = Resolve-PublicAssetPath $match.Groups[2].Value
  if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
    return $match.Value
  }

  $extension = [IO.Path]::GetExtension($assetPath).ToLowerInvariant()
  $mimeType = switch ($extension) {
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".webp" { "image/webp" }
    ".svg" { "image/svg+xml" }
    ".gif" { "image/gif" }
    default { "application/octet-stream" }
  }
  $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($assetPath))
  return "url(""data:$mimeType;base64,$base64"")"
})

$inline = @"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Small Phone</title>
    <style>
$css
html,body,#root{margin:0!important;width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden!important;background:#101010!important;}
.phone-stage{width:100vw!important;height:var(--app-vvh,100dvh)!important;min-height:var(--app-vvh,100dvh)!important;padding:0!important;align-items:center!important;justify-content:center!important;background:#101010!important;}
.phone-shell{width:100vw!important;max-width:100vw!important;height:var(--app-vvh,100dvh)!important;max-height:var(--app-vvh,100dvh)!important;border-width:0!important;border-radius:0!important;}
.phone-shell,.phone-shell *{-ms-overflow-style:none!important;scrollbar-width:none!important;}
.phone-shell::-webkit-scrollbar,.phone-shell *::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
.circle-button,.save-button,.fetch-button,.hand-input,button,input,textarea,select{-webkit-tap-highlight-color:transparent;}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
$js
    </script>
  </body>
</html>
"@

$webHtml = Join-Path $mobileRoot "web.html"
$webContent = Join-Path $mobileRoot "web-content.js"
Set-Content -Path $webHtml -Value $inline -Encoding utf8
node (Join-Path $mobileRoot "make-web-content.cjs")

Write-Host "Refreshed Expo WebView content:" $webContent
