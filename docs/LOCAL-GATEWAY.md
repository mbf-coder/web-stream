# Run Web Stream with a local MediaMTX gateway

This setup runs the media gateway on your own PC only while you are live. The static Web Stream site can remain on GitHub Pages.

## Requirements

- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)
- A modern browser with camera/microphone permissions
- FFmpeg installed on the PC for RTMP/RTMPS forwarding
- A stable upload connection

## Start the gateway

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

For a one-destination test, run this in a separate terminal, replacing the placeholders:

```bash
ffmpeg -rtsp_transport tcp -i rtsp://127.0.0.1:8554/live -c:v copy -c:a copy -f flv "rtmps://PLATFORM-INGEST-URL/APP/STREAM_KEY"
```

Keep the command running while live. Close FFmpeg to stop forwarding. Treat the command line and terminal history as sensitive because the URL contains the stream key. For multiple platforms, run a separate FFmpeg process per destination or use an FFmpeg tee configuration with protected local secrets.

## Stop everything

1. In Web Stream, select **Stop gateway stream**.
2. Stop the FFmpeg process.
3. Stop MediaMTX:

```bash
docker compose -f docker-compose.local.yml down
```

## Network notes

- This is a local-PC workflow. A phone or another computer cannot use its own `localhost` to reach this gateway.
- Do not expose ports 8554, 8889, or 8189 directly to the public internet.
- If you want to publish from another device, use a properly secured VPN/tunnel and configure HTTPS, authentication, CORS, and WebRTC ICE/TURN accordingly.
- Some platform ingest endpoints require specific codecs, keyframe intervals, or audio formats. If stream copy is rejected, transcode with FFmpeg (for example H.264 video + AAC audio) instead of `-c copy`.
- GitHub Pages cannot host MediaMTX. The gateway runs on your PC and stops when you shut it down.
