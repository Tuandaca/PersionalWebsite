Add-Type -AssemblyName System.Drawing

$outputPath = Join-Path $PSScriptRoot '..\public\og-card.png'
$bitmap = [System.Drawing.Bitmap]::new(1200, 630)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

try {
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Point]::new(0, 0),
    [System.Drawing.Point]::new(1200, 630),
    [System.Drawing.Color]::FromArgb(255, 1, 5, 3),
    [System.Drawing.Color]::FromArgb(255, 3, 25, 16)
  )
  $graphics.FillRectangle($background, 0, 0, 1200, 630)
  $background.Dispose()

  $band = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(24, 0, 255, 135), 180)
  $graphics.DrawLine($band, 170, 630, 1100, 40)
  $band.Dispose()
  $rim = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(38, 0, 220, 180), 2)
  $graphics.DrawLine($rim, 0, 535, 1120, 0)
  $rim.Dispose()

  $random = [System.Random]::new(131)
  for ($i = 0; $i -lt 55; $i++) {
    $x = $random.Next(40, 1170)
    $y = $random.Next(30, 600)
    $star = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($random.Next(30, 90), 135, 225, 175))
    $graphics.FillEllipse($star, $x, $y, 2, 2)
    $star.Dispose()
  }

  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 255, 249))
  $green = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 0, 255, 135))
  $muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 179, 206, 191))
  $nameFont = [System.Drawing.Font]::new('Arial', 65, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $roleFont = [System.Drawing.Font]::new('Arial', 43, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $smallFont = [System.Drawing.Font]::new('Arial', 23, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString('Ngo Anh Tuan', $nameFont, $white, 75, 180)
  $graphics.DrawString('Full-Stack Engineer', $roleFont, $green, 78, 284)
  $graphics.DrawString('Building robust digital products', $smallFont, $muted, 80, 374)
  $graphics.DrawString('tuandacadev.vercel.app', $smallFont, $green, 80, 540)
  $nameFont.Dispose(); $roleFont.Dispose(); $smallFont.Dispose()
  $white.Dispose(); $green.Dispose(); $muted.Dispose()
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output $outputPath
