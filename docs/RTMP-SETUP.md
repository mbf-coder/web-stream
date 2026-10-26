# RTMP publishing architecture

## Important browser limitation

A web browser cannot send an RTMP/RTMPS stream directly from `getUserMedia()`. RTMP is not a browser-native publishing protocol. A production setup needs a media gateway that accepts WebRTC/WHIP from the browser and relays that media to each platform's RTMP ingest endpoint.

GitHub Pages hosts only the static studio; it cannot run this gateway or store stream keys securely.

## Recommended production flow

```text
Browser camera + microphone
          |
          | WebRTC / WHIP over HTTPS
          v
Media gateway (MediaMTX or managed streaming service)
          |
          +---- RTMPS ---> Facebook Live
          +---- RTMPS ---> YouTube Live
          +---- RTMPS ---> Twitch
          +---- RTMPS ---> other supported destinations
```

## Configure each platform

1. Create a live event in the platform's creator dashboard.
2. Copy its RTMP/RTMPS ingest URL and stream key.
3. Store both on the media gateway/server as protected secrets. Do not commit them, put them in frontend `VITE_*` variables, or save them in browser storage.
4. Configure a relay process (for example FFmpeg) to read the gateway's incoming stream and publish to the platform. For multiple destinations, run one relay output per destination.
5. Test with an unlisted/private broadcast first, then stop the relay and rotate any key exposed in logs.

## Requirements before this can go live

- A public HTTPS endpoint for browser WHIP/WebRTC publishing.
- A media gateway with WebRTC/WHIP ingest and RTMP/RTMPS output (or a managed provider that offers these features).
- Server-side destination configuration and secret storage.
- TURN support if the chosen gateway/network requires it.
- A deployed service URL and environment configuration; none of these services run on GitHub Pages.

## Why the RTMP form in the studio cannot do the relay alone

A server URL and stream key are not enough to publish from a browser. The camera media must first reach a server-side media gateway. The existing peer-to-peer room is for browser-to-browser tests and does not currently feed its video into an RTMP relay.
