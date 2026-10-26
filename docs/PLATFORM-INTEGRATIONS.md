# Platform integrations and deployment notes

## Current status
The interface is a prototype. Facebook Live, YouTube Live, Twitch, TikTok, Kick and custom RTMP destinations are not connected to provider APIs. The WebRTC room is intended for small peer-to-peer test sessions and requires the signaling server to be running.

## GitHub Pages
Pages serves only the static frontend. The Actions workflow builds the Vite project and deploys `dist/`. Enable Pages with **GitHub Actions** as the build source in repository settings. The signaling server must be deployed separately on a WebSocket-capable host; configure `VITE_SIGNALING_URL` at build time to point to it.

## OAuth checklist
- Register an application with each provider and configure exact callback URLs.
- Implement Authorization Code flow on the backend with state validation and PKCE where supported.
- Keep client secrets and refresh/access tokens on the server; encrypt tokens at rest.
- Request the minimum required scopes, handle revocation, and comply with provider app review requirements.
- Do not claim a platform is connected until OAuth and a test broadcast have succeeded.

## RTMP checklist
Browsers do not natively publish RTMP. Use a trusted media gateway or ingest service to receive WebRTC/WHIP and relay to RTMP/RTMPS destinations. Store stream keys server-side, never in local storage or frontend environment variables. Redact keys from logs and provide rotation and disconnect controls.

## WebRTC limitations
Peer-to-peer mesh scales poorly as viewer count increases. Public STUN alone does not work on every network; production use needs TURN and usually an SFU or managed media service. Use HTTPS in deployed environments for camera and microphone access.