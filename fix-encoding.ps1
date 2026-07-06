$replacements = @(
  @{ From = "ðŸ”¥"; To = "&#128293;" },
  @{ From = "ðŸ‘Ž"; To = "&#128078;" },
  @{ From = "ðŸš©"; To = "&#128681;" },
  @{ From = "âšœï¸"; To = "&#9884;&#65039;" },
  @{ From = "âš”ï¸"; To = "&#9876;&#65039;" },
  @{ From = "ðŸ‰"; To = "&#128009;" },
  @{ From = "ðŸŒ"; To = "&#127760;" },
  @{ From = "â€“"; To = "&ndash;" },
  @{ From = "â€™"; To = "&rsquo;" },
  @{ From = "â€œ"; To = "&ldquo;" },
  @{ From = "â€\u009d"; To = "&rdquo;" },
  @{ From = "â€¦"; To = "&hellip;" },
  @{ From = "â†"; To = "&larr;" },
  @{ From = "â†’"; To = "&rarr;" },
  @{ From = "â€º"; To = "&rsaquo;" },
  @{ From = "Â·"; To = "&middot;" },
  @{ From = "Â©"; To = "&copy;" }
)

$files = Get-ChildItem -Path . -Recurse -Filter "index.html" -File |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" }

foreach ($f in $files) {
  $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
  $original = $content
  foreach ($pair in $replacements) {
    $content = $content -replace [regex]::Escape($pair.From), $pair.To
  }
  if ($content -ne $original) {
    Set-Content -Path $f.FullName -Value $content -Encoding UTF8
    Write-Host "Fixed: $($f.FullName)" -ForegroundColor Green
  }
}
Write-Host "Done." -ForegroundColor Cyan
