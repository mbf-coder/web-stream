# Web Stream

A browser-first live studio concept built with React, TypeScript, Vite, WebRTC, and WebSocket signaling. Responsive for desktop, tablet, and mobile browsers.

## MVP features
- Real browser camera and microphone capture with permission handling, local preview, mute/unmute, and device release controls.
- WebRTC audio/video room for small test sessions (requires the signaling server to be deployed and reachable).
- Room codes and WebRTC peer-to-peer audio/video for small test sessions.
- WebSocket signaling server with room membership and SDP/ICE relay.
- UI settings for Facebook Live, YouTube Live, Twitch, TikTok/Kick and custom RTMP/RTMPS destinations.
- GitHub Actions workflow for GitHub Pages preview.
- Integration guidance in [docs/PLATFORM-INTEGRATIONS.md](docs/PLATFORM-INTEGRATIONS.md).

## Important integration status
**Platform cards and custom RTMP form are UI scaffolding, not connected integrations yet.** They do not authenticate platform accounts, save stream keys, or broadcast to external social networks. OAuth requires provider credentials, callback URLs, scopes, token storage, and sometimes app review. RTMP publishing requires a server-side media relay/FFmpeg pipeline; a browser cannot publish RTMP directly. Do not enter real production stream keys into this prototype.

## Run locally
Requires Node.js 20+.

```bash
npm install
npm run dev
```

In another terminal run `npm run dev:server`. Open the Vite URL (usually http://localhost:5173). Camera/microphone access requires HTTPS when deployed; localhost is allowed during local development.

## Configuration
Copy `.env.example` to `.env`:
- `VITE_SIGNALING_URL`: optional WebSocket URL, e.g. `wss://your-domain.example/ws`.
- `VITE_WHIP_ENDPOINT`: optional HTTPS WHIP publish URL, e.g. `https://media.example.com/live/whip` (must point to a configured gateway path).
- `PORT`: signaling server port (default `8787`).

Never put OAuth client secrets, access tokens, or long-lived stream keys in `VITE_*` variables or commit them.

## Build and preview
Run `npm run build` and `npm run preview`. The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages on pushes to `main`. Once the workflow succeeds and Pages is enabled, the preview URL should be https://mbf-coder.github.io/web-stream/.

GitHub Pages hosts only the static UI. The WebSocket server, OAuth callbacks, and RTMP media pipeline need separate backend hosting. Set `VITE_SIGNALING_URL` to your deployed WebSocket endpoint before building for production.

## Production architecture
Use browser capture → WebRTC/WHIP ingest → trusted media gateway → server-side RTMP/RTMPS outputs. Use backend OAuth Authorization Code flows with state/PKCE as supported, encrypted token storage, authorization, rate limiting, secret redaction, and disconnect/revocation support. Peer-to-peer mesh broadcasting is only for small audiences; use an SFU or managed media service at scale.

## License
MIT. See [LICENSE](LICENSE).

## RTMP / Facebook / YouTube / Twitch

A browser cannot publish RTMP directly. To relay a real camera stream to Facebook Live, YouTube Live, Twitch, or another RTMP destination, deploy a WebRTC/WHIP media gateway and a server-side RTMP relay. See [the RTMP setup guide](docs/RTMP-SETUP.md). GitHub Pages alone cannot run the relay or securely store stream keys.
