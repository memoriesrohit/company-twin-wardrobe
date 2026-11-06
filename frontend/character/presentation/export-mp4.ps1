param([Parameter(Mandatory=$true)][string]$Recording)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Recording -PathType Leaf)) { throw 'Recording not found' }
& ffmpeg -hide_banner -y -i $Recording -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -r 30 -c:a aac -b:a 160k -movflags +faststart "$PSScriptRoot/character-sop.mp4"
if ($LASTEXITCODE -ne 0) { throw 'MP4 encoding failed' }
