param(
    [string]$InputFile,
    [string]$OutputFile
)

if (-not (Test-Path $InputFile)) {
    Write-Host "Input file not found."
    exit
}

Write-Host "Converting $InputFile -> $OutputFile"

ffmpeg -i "$InputFile" -c:v libx264 -c:a aac "$OutputFile"

Write-Host "Conversion complete."
