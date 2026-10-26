import { useEffect, useRef, useState } from 'react';
type Role = 'host' | 'viewer';
type Peer = { pc: RTCPeerConnection; pending: RTCIceCandidateInit[] };
const wsUrl = import.meta.env.VITE_SIGNALING_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:8787/ws`;
const roomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function App() {
  const [role,setRole]=useState<Role>('host'); const [room,setRoom]=useState(roomCode); const [title,setTitle]=useState('My live stream');
  const [live,setLive]=useState(false); const [previewReady,setPreviewReady]=useState(false); const [busy,setBusy]=useState(false); const [connected,setConnected]=useState(false); const [camera,setCamera]=useState(true); const [mic,setMic]=useState(true);
  const [status,setStatus]=useState('Ready to set up your stream'); const [error,setError]=useState(''); const [viewers,setViewers]=useState(0); const [copied,setCopied]=useState(false);
  const [showDestinations,setShowDestinations]=useState(false); const [rtmpName,setRtmpName]=useState('My RTMP destination'); const [rtmpUrl,setRtmpUrl]=useState(''); const [rtmpKey,setRtmpKey]=useState(''); const [destinations,setDestinations]=useState<string[]>([]); const [destinationNotice,setDestinationNotice]=useState('');
  const localVideo=useRef<HTMLVideoElement>(null); const remoteVideo=useRef<HTMLVideoElement>(null); const stream=useRef<MediaStream|null>(null); const socket=useRef<WebSocket|null>(null);
  const peers=useRef(new Map<string,Peer>()); const selfId=useRef(''); const liveRef=useRef(false); const roleRef=useRef<Role>(role); roleRef.current=role;
  const send=(data:object)=>{if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify(data));};
  const closePeers=()=>{peers.current.forEach(p=>p.pc.close());peers.current.clear();setViewers(0);};

  const createPeer=async(id:string)=>{
    if(!stream.current||peers.current.has(id))return;
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]}); const entry={pc,pending:[] as RTCIceCandidateInit[]}; peers.current.set(id,entry);
    stream.current.getTracks().forEach(t=>pc.addTrack(t,stream.current!));
    pc.onicecandidate=e=>{if(e.candidate)send({type:'ice-candidate',to:id,candidate:e.candidate});};
    pc.onconnectionstatechange=()=>{if(['failed','closed'].includes(pc.connectionState)){peers.current.delete(id);setViewers(n=>Math.max(0,n-1));}};
    const offer=await pc.createOffer(); await pc.setLocalDescription(offer); send({type:'offer',to:id,sdp:pc.localDescription});
  };
  const acceptOffer=async(id:string,sdp:RTCSessionDescriptionInit)=>{
    let entry=peers.current.get(id);
    if(!entry){const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});entry={pc,pending:[]};peers.current.set(id,entry);
      pc.ontrack=e=>{if(remoteVideo.current){remoteVideo.current.srcObject=e.streams[0];setLive(true);setStatus('Receiving live video');}};
      pc.onicecandidate=e=>{if(e.candidate)send({type:'ice-candidate',to:id,candidate:e.candidate});};
      pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed')setError('Connection failed. This network may require a TURN server.');};
    }
    await entry.pc.setRemoteDescription(sdp); for(const c of entry.pending.splice(0)){try{await entry.pc.addIceCandidate(c);}catch{}}
    const answer=await entry.pc.createAnswer();await entry.pc.setLocalDescription(answer);send({type:'answer',to:id,sdp:entry.pc.localDescription});
  };
  const connect=(nextRole:Role,code:string)=>{
    setStatus('Connecting to signaling server…');const ws=new WebSocket(wsUrl);socket.current=ws;
    const timeout=window.setTimeout(()=>{if(ws.readyState!==WebSocket.OPEN){ws.close();setError(`Cannot connect to ${wsUrl}. Start the signaling server with npm run dev:server.`);setStatus('Unable to connect');}},7000);
    ws.onopen=()=>{clearTimeout(timeout);ws.send(JSON.stringify({type:'join',room:code,role:nextRole==='host'?'broadcast':'watch'}));setConnected(true);};
    ws.onerror=()=>{clearTimeout(timeout);setError(`Could not connect to ${wsUrl}. Check that the signaling server is running.`);};
    ws.onclose=()=>{setConnected(false);if(liveRef.current)setStatus('Connection closed');};
    ws.onmessage=async ev=>{let m:any;try{m=JSON.parse(ev.data);}catch{return;}
      if(m.type==='joined'){selfId.current=m.id;setViewers((m.peers||[]).filter((p:any)=>p.role==='watch').length);setStatus(nextRole==='host'?'Connected — share the room code with viewers':'Connected — waiting for the host');if(nextRole==='host')for(const p of (m.peers||[]).filter((p:any)=>p.role==='watch'))await createPeer(p.id);}
      else if(m.type==='peer-joined'){if(nextRole==='host'){setViewers(n=>n+1);if(stream.current)await createPeer(m.id);}}
      else if(m.type==='peer-left'){const p=peers.current.get(m.id);p?.pc.close();peers.current.delete(m.id);setViewers(n=>Math.max(0,n-1));}
      else if(m.type==='offer'&&nextRole==='viewer')await acceptOffer(m.from,m.sdp);
      else if(m.type==='answer'&&nextRole==='host'){const p=peers.current.get(m.from);if(p){await p.pc.setRemoteDescription(m.sdp);for(const c of p.pending.splice(0)){try{await p.pc.addIceCandidate(c);}catch{}}}}
      else if(m.type==='ice-candidate'){const p=peers.current.get(m.from);if(p){if(p.pc.remoteDescription){try{await p.pc.addIceCandidate(m.candidate);}catch{}}else p.pending.push(m.candidate);}}
      else if(m.type==='stream-ended'&&nextRole==='viewer'){if(remoteVideo.current)remoteVideo.current.srcObject=null;setLive(false);setStatus('The host has ended the stream');closePeers();}
      else if(m.type==='error'){setError(m.message||'Signaling error');setStatus('Unable to connect');}
    };
  };
  const getMediaError = (e: unknown) => {
    if (e instanceof DOMException && e.name === 'NotAllowedError') return 'Camera/microphone permission was denied. Allow access in your browser settings and try again.';
    if (e instanceof DOMException && e.name === 'NotFoundError') return 'No camera or microphone was found. Connect a device or enable one in system settings.';
    if (e instanceof DOMException && e.name === 'NotReadableError') return 'Camera or microphone is already in use by another app. Close it and try again.';
    if (!navigator.mediaDevices?.getUserMedia) return 'Camera access requires HTTPS (or localhost) and a browser that supports media capture.';
    return e instanceof Error ? e.message : 'Could not access camera or microphone.';
  };
  const startPreview = async () => {
    try {
      setError(''); setBusy(true); setStatus('Requesting camera and microphone permission…');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS (or localhost). Open this site over HTTPS and try again.');
      const media = await navigator.mediaDevices.getUserMedia({
        video: camera ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: mic ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false
      });
      stream.current?.getTracks().forEach(t => t.stop());
      stream.current = media;
      if (localVideo.current) { localVideo.current.srcObject = media; await localVideo.current.play().catch(() => {}); }
      setPreviewReady(true); setStatus('Camera and microphone ready'); 
    } catch (e) { setError(getMediaError(e)); setStatus('Device setup failed'); }
    finally { setBusy(false); }
  };
  const startHost = async () => {
    try {
      setError('');
      if (!title.trim()) throw new Error('Add a title for your stream.');
      if (!room.trim()) throw new Error('Enter a room code.');
      if (!stream.current) await startPreview();
      if (!stream.current) return;
      const tracks = stream.current.getTracks();
      if (!tracks.some(t => t.enabled && t.readyState === 'live')) throw new Error('Turn on the camera or microphone before going live.');
      setBusy(true); connect('host', room.toUpperCase()); setLive(true); liveRef.current = true; setStatus('Starting stream…');
    } catch (e) { setError(getMediaError(e)); setStatus('Unable to start'); }
    finally { setBusy(false); }
  };
  const joinViewer=()=>{setError('');if(!room.trim()){setError('Enter a room code.');return;}connect('viewer',room.toUpperCase());};
  const stop = () => {
    send({ type: 'stream-ended' }); closePeers();
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    socket.current?.close(); socket.current = null;
    setConnected(false); setLive(false); setPreviewReady(false); liveRef.current = false;
    setStatus('Stream stopped'); setError('');
  };
  const stopPreview = () => {
    if (connected || live) return;
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    setPreviewReady(false); setStatus('Camera and microphone released');
  };
  const toggle=(kind:'video'|'audio')=>{const enabled=kind==='video'?!camera:!mic;if(kind==='video')setCamera(enabled);else setMic(enabled);stream.current?.getTracks().filter(t=>t.kind===kind).forEach(t=>t.enabled=enabled);};
  const copy=async()=>{try{await navigator.clipboard.writeText(room.toUpperCase());setCopied(true);setTimeout(()=>setCopied(false),1400);}catch{setError('Copy unavailable. Select and copy the room code manually.');}};
  useEffect(()=>()=>{stream.current?.getTracks().forEach(t=>t.stop());socket.current?.close();peers.current.forEach(p=>p.pc.close());},[]);
  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon">W</span>web<span className="accent">stream</span></a><span className="top-status"><i className={connected?'online':''}/>{connected?'Connected':'Studio ready'} <b>BETA</b></span></header>
    <section className="hero"><div><p className="eyebrow">BROWSER LIVE STUDIO</p><h1>Your stream.<br/><em>Your space.</em></h1><p className="subhead">Go live from your browser, with no downloads required.</p></div><span className="hero-tag">● &nbsp;Built for creators&nbsp; · &nbsp;WebRTC</span></section>
    <section className="workspace"><div className="preview-col"><div className="section-head"><h2><small>01</small> Studio preview</h2><span className={live?'live-tag on':'live-tag'}>● {live?'LIVE':'PREVIEW'}</span></div>
      <div className="preview">{role==='host'?<video ref={localVideo} autoPlay muted playsInline/>:<video ref={remoteVideo} autoPlay playsInline/>}{!(live || previewReady)&&<div className="empty"><div className="camera-icon">▣</div><strong>{role==='host'?'Start camera preview to check your devices':'Waiting for the stream'}</strong><p>{role==='host'?'Your browser will ask for permission when you test your camera.':'Join a room and video will appear when the host goes live.'}</p></div>}<span className="preview-label">● {live?'ON AIR':'LOCAL PREVIEW'}</span><span className="hd-label">HD · 16:9</span></div>
      <div className="controls"><button disabled={!previewReady} onClick={()=>toggle('video')}>{camera?'▣ Camera on':'▣ Camera off'}</button><button disabled={!previewReady} onClick={()=>toggle('audio')}>{mic?'♫ Mic on':'♫ Mic muted'}</button><span className="grow"/>{connected&&<button className="end-btn" onClick={stop}>{role==='host'?'End stream':'Leave stream'}</button>}</div>
      <p className="status-line"><i className={error?'error-dot':''}/>{error||status}</p>
    </div><aside className="setup"><div className="section-head"><h2><small>02</small> Set up your stream</h2></div>
      <div className="tabs"><button className={role==='host'?'selected':''} disabled={connected} onClick={()=>setRole('host')}>Host a stream</button><button className={role==='viewer'?'selected':''} disabled={connected} onClick={()=>setRole('viewer')}>Watch a stream</button></div>
      {role==='host'&&<><label htmlFor="title">Stream title</label><input id="title" value={title} maxLength={80} disabled={connected} onChange={e=>setTitle(e.target.value)} placeholder="What are you streaming?"/></>}
      <label htmlFor="room">{role==='host'?'Room code':'Enter room code'}</label><div className="room-row"><input id="room" value={room} maxLength={12} disabled={connected} onChange={e=>setRoom(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,''))}/>{role==='host'&&<button className="copy" onClick={copy}>{copied?'Copied!':'Copy'}</button>}</div><p className="hint">{role==='host'?'Share this code privately with the people you want to watch.':'Ask the host for their room code.'}</p>
      <div className="rule"/><div className="info-row"><span>Viewers connected</span><strong>{viewers}</strong></div><div className="info-row"><span>Connection</span><strong className={connected?'green':''}>{connected?'Ready':'Not connected'}</strong></div>
      <>{role==='host'&&!previewReady&&<button className="outline-btn" disabled={busy} onClick={startPreview}>{busy?'Requesting access…':'Test camera & microphone'}</button>}<button className="primary" disabled={connected||busy} onClick={role==='host'?startHost:joinViewer}>{role==='host'?(busy?'Starting…':'●　Start live stream'):'↗　Join stream'} <span>→</span></button></>}<p className="privacy">◇ Camera and microphone are used only after you grant browser permission. Use HTTPS for deployed access.</p>
    </aside></section>
    <section className="destinations-section">
      <div className="destinations-heading"><div><p className="eyebrow">03 · DISTRIBUTION</p><h2>Stream to every platform</h2><p className="dest-copy">Plan your multistream setup from one studio. Platform connections require server-side OAuth configuration; custom RTMP targets need a secure media relay.</p></div><button className="outline-btn" onClick={()=>setShowDestinations(v=>!v)}>{showDestinations?'Hide settings':'Configure destinations'} <span>{showDestinations?'−':'+'}</span></button></div>
      <div className="platform-grid">
        <article className="platform-card"><span className="platform-logo facebook">f</span><div><strong>Facebook Live</strong><small>Meta OAuth / Live Producer</small></div><span className="platform-state">Setup needed</span><p>Connect a Facebook Page and authorize live video permissions.</p><button onClick={()=>setDestinationNotice('Facebook OAuth is not connected yet. Add Meta app credentials and implement the server-side OAuth callback before enabling this connection.')}>Connect account ↗</button></article>
        <article className="platform-card"><span className="platform-logo youtube">▶</span><div><strong>YouTube Live</strong><small>Google OAuth / Live Streaming API</small></div><span className="platform-state">Setup needed</span><p>Authorize your channel through Google's OAuth consent screen.</p><button onClick={()=>setDestinationNotice('YouTube OAuth is not connected yet. Configure a Google Cloud OAuth client and YouTube Data API credentials on the server.')}>Connect account ↗</button></article>
        <article className="platform-card"><span className="platform-logo twitch">▰</span><div><strong>Twitch</strong><small>Twitch account / RTMP</small></div><span className="platform-state">Setup needed</span><p>Use Twitch authorization or a stream key stored securely on the server.</p><button onClick={()=>setDestinationNotice('Twitch integration requires an approved Twitch application or a securely managed RTMP stream key.')}>Connect account ↗</button></article>
        <article className="platform-card"><span className="platform-logo multi">＋</span><div><strong>Other platforms</strong><small>TikTok · Kick · Custom RTMP</small></div><span className="platform-state">Flexible</span><p>Add any service that provides a compatible RTMP/RTMPS ingest endpoint.</p><button onClick={()=>setShowDestinations(v=>!v)}>Set up RTMP ↗</button></article>
      </div>
      {showDestinations&&<div className="rtmp-panel"><div><h3>Custom RTMP destination</h3><p>These fields are a UI prototype only. The current MVP does not store credentials or relay media to external platforms yet.</p></div><div className="rtmp-fields"><label>Destination name<input value={rtmpName} onChange={e=>setRtmpName(e.target.value)} placeholder="e.g. Kick main channel"/></label><label>RTMP / RTMPS server URL<input value={rtmpUrl} onChange={e=>setRtmpUrl(e.target.value)} placeholder="rtmps://live.example.com/app" autoComplete="off"/></label><label>Stream key<input type="password" value={rtmpKey} onChange={e=>setRtmpKey(e.target.value)} placeholder="Enter only in a secured backend flow" autoComplete="new-password"/></label></div><button className="primary rtmp-save" onClick={()=>{setDestinationNotice('Prototype only: nothing was saved or transmitted. To enable this, configure an authenticated backend and media relay first.');setRtmpKey('');}}>Validate setup <span>→</span></button>{destinations.length>0&&<p className="field-saved">Configured in this session: {destinations.join(', ')}</p>}</div>}
      {destinationNotice&&<p className="destination-notice" role="status">{destinationNotice}<button onClick={()=>setDestinationNotice('')} aria-label="Dismiss notice">×</button></p>}
      <p className="security-note">🔒 Never put OAuth client secrets or long-lived stream keys in frontend code, GitHub Pages, or committed <code>.env</code> files.</p>
    </section>
    <section className="features"><div><b>⌘</b><span><strong>Browser-first</strong><small>No app install needed</small></span></div><div><b>↗</b><span><strong>Peer-to-peer video</strong><small>Powered by WebRTC</small></span></div><div><b>▤</b><span><strong>Responsive studio</strong><small>Desktop and mobile layouts</small></span></div></section>
    <footer><span>© 2026 Web Stream</span><span>Made for creators, one stream at a time.</span><a href="https://github.com/mbf-coder/web-stream">Open source on GitHub ↗</a></footer>
  </main>;
}