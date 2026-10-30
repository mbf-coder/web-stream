# Run Web Stream with a local MediaMTX gateway

This setup runs the media gateway on your own PC only while you are live. The static Web Stream site can remain on GitHub Pages.

## Requirements

- Docker Desktop for Windows (with the Linux container engine enabled), or Docker Engine + Compose (Linux/macOS)
- PowerShell 5.1 or later on Windows
- A modern browser with camera/microphone permissions
- FFmpeg installed on the PC for RTMP/RTMPS forwarding
- A stable upload connection

## Start the gateway

### Windows 11 (recommended)

1. Install and start Docker Desktop for Windows. Wait until Docker Desktop reports that its engine is running.
2. Open PowerShell in the cloned repository folder.
3. If Windows blocks local scripts, run this once for the current PowerShell window only: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.
4. Start MediaMTX:

```powershell
.\\windows\\start-gateway.ps1
```

To inspect logs:

```powershell
docker compose -f docker-compose.local.yml logs -f mediamtx
```

### macOS / Linux

From the repository folder:

```bash
docker compose -f docker-compose.local.yml up -d
```

In the Web Stream studio, set **WHIP publish endpoint** to:

```
http://localhost:8889/live/whip
```

Use this URL only when the browser is running on the same PC as Docker. The browser treats localhost as a secure context even when the studio itself is hosted over HTTPS. If CORS blocks the request, check the MediaMTX logs and confirm the studio origin is allowed.

Start the camera preview, then choose **Publish to gateway**. MediaMTX receives the WebRTC stream on path `live`.

## Send the stream to a social platform

Install FFmpeg on the same PC. Obtain the platform's RTMP ingest URL and stream key from its official live dashboard. Do not put the key in the GitHub repository, frontend, or a `VITE_*` variable.

On Windows 11, use the included helper. It asks for the full RTMP/RTMPS ingest URL as a secure PowerShell prompt and starts FFmpeg:

```powershell
.\\windows\\forward-to-platform.ps1
```

The helper transcodes browser WebRTC media to H.264/AAC because browser-negotiated VP8/Opus is not accepted by many RTMP ingest services. It runs until you press Ctrl+C. The URL is still passed to FFmpeg as a process argument while it runs, so only do this on a trusted PC and never share process listings or terminal logs containing credentials.

For manual use on other operating systems, or a one-destination test, run this in a separate terminal, replacing the placeholders:

```bash
ffmpeg -rtsp_transport tcp -i rtsp://127.0.0.1:8554/live -c:v copy -c:a copy -f flv "rtmps://PLATFORM-INGEST-URL/APP/STREAM_KEY"
```

Keep the command running while live. Close FFmpeg to stop forwarding. Treat the command line and terminal history as sensitive because the URL contains the stream key. For multiple platforms, run a separate FFmpeg process per destination or use an FFmpeg tee configuration with protected local secrets.

## Stop everything

1. In Web Stream, select **Stop gateway stream**.
2. Stop the FFmpeg process.
3. Stop MediaMTX:

Windows PowerShell:

```powershell
.\\windows\\stop-gateway.ps1
```

macOS / Linux:

```bash
docker compose -f docker-compose.local.yml down
```

## Network notes

- This is a local-PC workflow. A phone or another computer cannot use its own `localhost` to reach this gateway.
- Do not expose ports 8554, 8889, or 8189 directly to the public internet.
- If you want to publish from another device, use a properly secured VPN/tunnel and configure HTTPS, authentication, CORS, and WebRTC ICE/TURN accordingly.
- Some platform ingest endpoints require specific codecs, keyframe intervals, or audio formats. If stream copy is rejected, transcode with FFmpeg (for example H.264 video + AAC audio) instead of `-c copy`.
- GitHub Pages cannot host MediaMTX. The gateway runs on your PC and stops when you shut it down.
