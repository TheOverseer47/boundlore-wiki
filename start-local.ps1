# BoundLore local test server (PowerShell only — no Python/Node required)
# Usage: .\start-local.ps1

$Port = 8080
$Root = (Resolve-Path $PSScriptRoot).Path

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".png"  = "image/png"
  ".webp" = "image/webp"
  ".gif"  = "image/gif"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".xml"  = "application/xml"
  ".txt"  = "text/plain; charset=utf-8"
  ".pdf"  = "application/pdf"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
}

function Get-LocalPath([string]$rawUrl) {
  $path = [System.Uri]::UnescapeDataString($rawUrl.Split("?")[0])
  if ($path -eq "/") { return Join-Path $Root "index.html" }
  $candidate = Join-Path $Root ($path.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar)
  if (Test-Path $candidate -PathType Container) {
    $index = Join-Path $candidate "index.html"
    if (Test-Path $index) { return $index }
  }
  return $candidate
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
  $listener.Start()
} catch {
  Write-Host "ERROR: Port $Port already in use or blocked." -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host ""
Write-Host "BoundLore local server running" -ForegroundColor Green
Write-Host "Root: $Root"
Write-Host ""
Write-Host "Open:" -ForegroundColor Cyan
Write-Host "  http://localhost:$Port/wiki/create-post/?type=discovery"
Write-Host ""
Write-Host "Discovery V2 is auto-enabled on localhost." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response

  try {
    $localPath = Get-LocalPath $request.Url.LocalPath
    if (-not (Test-Path $localPath -PathType Leaf)) {
      $fallback404 = Join-Path $Root "404.html"
      if (Test-Path $fallback404) {
        $bytes = [IO.File]::ReadAllBytes($fallback404)
        $response.StatusCode = 404
        $response.ContentType = "text/html; charset=utf-8"
      } else {
        $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.StatusCode = 404
        $response.ContentType = "text/plain; charset=utf-8"
      }
    } else {
      $bytes = [IO.File]::ReadAllBytes($localPath)
      $ext = [IO.Path]::GetExtension($localPath).ToLowerInvariant()
      $response.StatusCode = 200
      $response.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
    }

    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $msg = [Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
    $response.StatusCode = 500
    $response.ContentType = "text/plain; charset=utf-8"
    $response.ContentLength64 = $msg.Length
    $response.OutputStream.Write($msg, 0, $msg.Length)
  } finally {
    $response.OutputStream.Close()
  }
}
