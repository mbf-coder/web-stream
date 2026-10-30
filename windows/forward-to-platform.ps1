$ErrorActionPreference = 'Stop'
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Write-Host "FFmpeg is not on PATH. Add the folder containing ffmpeg.exe to PATH, then reopen PowerShell." -ForegroundColor Red
  exit 1
}
Write-Host "This forwards the local MediaMTX stream to one RTMP/RTMPS destination."
Write-Host "Start the Web Stream WHIP broadcast first, then run this script."
$secureUrl = Read-Host "Paste the complete RTMP/RTMPS ingest URL including stream key" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try { $target = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
if ([string]::IsNullOrWhiteSpace($target) -or ($target -notmatch '^rtmps?://')) {
  throw "A complete rtmp:// or rtmps:// ingest URL is required."
}
Write-Host "Forwarding started. Press Ctrl+C here to stop forwarding." -ForegroundColor Green
# Browser WHIP commonly negotiates VP8/Opus. Re-encode to broadly compatible H.264/AAC for RTMP.
& ffmpeg -hide_banner -loglevel info -rtsp_transport tcp -i "rtsp://127.0.0.1:8554/live" -map 0:v:0 -map 0:a? -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -profile:v baseline -b:v 4500k -maxrate 4500k -bufsize 9000k -g 60 -c:a aac -b:a 160k -ar 44100 -f flv $target
$code = $LASTEXITCODE
$target = $null
if ($code -ne 0) { throw "FFmpeg exited with code $code. Check the platform ingest URL, stream key, and FFmpeg build." }
