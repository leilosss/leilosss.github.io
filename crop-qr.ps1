# =============================================================
# Crop the QR body out of the payment-code screenshots (drop the side color bars).
#   dark-pixel bounding box (luminance < 120; yellow/orange bars are far brighter)
#   + 4% quiet zone -> PNG (lossless: never re-JPEG a QR)
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads .ps1 as ANSI,
#       so non-ASCII text here gets mangled and breaks parsing.
# NOTE: the source folder is a parameter on purpose -- never hardcode a personal
#       path (a WeChat temp path contains the account id) into a tracked file.
# Usage: powershell -ExecutionPolicy Bypass -File crop-qr.ps1 -SrcDir "<folder with the two jpgs>"
# =============================================================
param([string]$SrcDir = ".")

Add-Type -AssemblyName System.Drawing

$SRC = $SrcDir
$OUT = Join-Path $PSScriptRoot "frontend\public\tip"
New-Item -ItemType Directory -Force -Path $OUT | Out-Null

$jobs = @(
  @{ in = "409c275184a5b8345bd97034ff58cd75.jpg"; out = "wechat.png"; label = "wechat" },
  @{ in = "6cef0cae6901b916bd85f7e2ffbc5335.jpg"; out = "alipay.png"; label = "alipay" }
)

foreach ($j in $jobs) {
  $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $SRC $j.in))
  $w = $bmp.Width; $h = $bmp.Height
  $minX = $w; $minY = $h; $maxX = -1; $maxY = -1

  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $bmp.GetPixel($x, $y)
      $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
      if ($lum -lt 120) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $bw = $maxX - $minX + 1
  $bh = $maxY - $minY + 1
  $ratio = [Math]::Round($bw / $bh, 3)
  Write-Host "$($j.label): source ${w}x${h} | qr box ${bw}x${bh} at ($minX,$minY) | ratio $ratio"

  $pad = [int][Math]::Max(12, [Math]::Round($bw * 0.04))
  $cx = [Math]::Max(0, $minX - $pad)
  $cy = [Math]::Max(0, $minY - $pad)
  $cw = [Math]::Min($w - $cx, $bw + 2 * $pad)
  $ch = [Math]::Min($h - $cy, $bh + 2 * $pad)
  $side = [Math]::Min($cw, $ch)   # force square: the frame is aspect-square

  $rect = New-Object System.Drawing.Rectangle($cx, $cy, $side, $side)
  $crop = $bmp.Clone($rect, $bmp.PixelFormat)
  $dst = Join-Path $OUT $j.out
  $crop.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "  -> cropped ${side}x${side} saved $dst ($((Get-Item $dst).Length) bytes)"

  $crop.Dispose(); $bmp.Dispose()
}
Write-Host "done"
