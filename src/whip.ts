export type WhipSession = { peer: RTCPeerConnection; resourceUrl: string | null };

export async function publishWhip(endpoint: string, media: MediaStream): Promise<WhipSession> {
  const url = endpoint.trim();
  if (!url) throw new Error('Enter your gateway WHIP endpoint first.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') throw new Error('The WHIP endpoint must use HTTPS (localhost is allowed for development).');
  const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  try {
    media.getTracks().forEach(track => peer.addTrack(track, media));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    await new Promise<void>((resolve, reject) => {
      if (peer.iceGatheringState === 'complete') return resolve();
      const timeout = window.setTimeout(() => reject(new Error('ICE gathering timed out. Check gateway and TURN/network settings.')), 12000);
      const changed = () => { if (peer.iceGatheringState === 'complete') { window.clearTimeout(timeout); peer.removeEventListener('icegatheringstatechange', changed); resolve(); } };
      peer.addEventListener('icegatheringstatechange', changed);
    });
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/sdp', Accept: 'application/sdp' }, body: peer.localDescription?.sdp });
    if (!response.ok) throw new Error('Gateway rejected WHIP publish (' + response.status + '): ' + (await response.text()).slice(0, 240));
    const answer = await response.text();
    if (!answer.trim()) throw new Error('Gateway returned an empty SDP answer.');
    await peer.setRemoteDescription({ type: 'answer', sdp: answer });
    const location = response.headers.get('Location');
    return { peer, resourceUrl: location ? new URL(location, url).toString() : null };
  } catch (error) { peer.close(); throw error; }
}

export async function stopWhip(session: WhipSession | null) {
  if (!session) return;
  session.peer.close();
  if (session.resourceUrl) { try { await fetch(session.resourceUrl, { method: 'DELETE' }); } catch { /* peer is closed */ } }
}
