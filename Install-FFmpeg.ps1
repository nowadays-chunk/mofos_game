# Install-FFmpeg.ps1

$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$downloadPath = "$env:TEMP\ffmpeg.zip"
$extractPath = "C:\ffmpeg"

Write-Host "Downloading FFmpeg..."

Invoke-WebRequest -Uri $ffmpegUrl -OutFile $downloadPath

Write-Host "Extracting..."

Expand-Archive $downloadPath -DestinationPath $extractPath -Force

$ffmpegFolder = Get-ChildItem $extractPath | Where-Object {$_.PSIsContainer} | Select-Object -First 1

$binPath = "$($ffmpegFolder.FullName)\bin"

Write-Host "Adding FFmpeg to PATH..."

$currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)

if ($currentPath -notlike "*$binPath*") {
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$binPath",
        [EnvironmentVariableTarget]::Machine
    )
}

Write-Host "FFmpeg Installed!"

Write-Host "Testing installation..."
& "$binPath\ffmpeg.exe" -version
