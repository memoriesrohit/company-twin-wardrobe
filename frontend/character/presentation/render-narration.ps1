$ErrorActionPreference = 'Stop'
# Local synthetic fixture only. Uses the already installed Windows speech engine;
# browser SpeechSynthesis does not expose an exportable audio stream.
Add-Type -AssemblyName System.Speech
$fixture = Get-Content -LiteralPath "$PSScriptRoot/fixture.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$synth.Rate = 2
$segments = @()
$offset = 0.0
try {
  for ($i=0; $i -lt $fixture.scenes.Count; $i++) {
    $file = "narration-$i.wav"
    $synth.SetOutputToWaveFile((Join-Path $PSScriptRoot $file))
    $synth.Speak($fixture.scenes[$i].text)
    $synth.SetOutputToNull()
    $duration = [double](& ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 (Join-Path $PSScriptRoot $file))
    if ($LASTEXITCODE -ne 0) { throw 'Audio duration verification failed' }
    $segments += @{title=$fixture.scenes[$i].title; text=$fixture.scenes[$i].text; start=$offset; duration=$duration; audio=[Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $file)))}
    $offset += $duration
  }
} finally { $synth.Dispose() }
$json = @{title=$fixture.title; label=$fixture.label; duration=$offset; scenes=$segments} | ConvertTo-Json -Depth 6 -Compress
"export default $json;" | Set-Content -LiteralPath "$PSScriptRoot/narration.js" -Encoding UTF8
Write-Output "Narration duration: $offset seconds"
