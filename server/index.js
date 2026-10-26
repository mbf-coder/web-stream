import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 8787);
const server = createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true,service:'web-stream-signaling'})); return; }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ server, path: '/ws' });
const rooms = new Map();
const send = (ws, message) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message)); };
const roomPeers = (room) => [...(rooms.get(room)?.values() || [])];
wss.on('connection', (ws) => {
  ws.id = Math.random().toString(36).slice(2);
  ws.room = null; ws.role = null;
  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return send(ws,{type:'error',message:'Invalid JSON'}); }
    if (msg.type === 'join') {
      const room = String(msg.room || '').trim().toUpperCase();
      if (!room || room.length > 12 || !['broadcast','watch'].includes(msg.role)) return send(ws,{type:'error',message:'Invalid room or role'});
      if (!rooms.has(room)) rooms.set(room,new Map());
      const peers = rooms.get(room);
      if (msg.role === 'broadcast' && [...peers.values()].some(p=>p.role==='broadcast')) return send(ws,{type:'error',message:'This room already has a host'});
      ws.room=room; ws.role=msg.role; peers.set(ws.id,ws);
      send(ws,{type:'joined',id:ws.id,peers:[...peers.values()].filter(p=>p!==ws).map(p=>({id:p.id,role:p.role}))});
      for (const p of peers.values()) if (p!==ws) send(p,{type:'peer-joined',id:ws.id,role:ws.role});
      return;
    }
    if (!ws.room) return send(ws,{type:'error',message:'Join a room first'});
    const allowed = new Set(['offer','answer','ice-candidate']);
    if (allowed.has(msg.type)) {
      const target=rooms.get(ws.room)?.get(String(msg.to || msg.from || ''));
      if (target) send(target,{...msg,from:ws.id,to:target.id});
    } else if (msg.type === 'stream-ended' && ws.role === 'broadcast') {
      for (const p of roomPeers(ws.room)) if (p!==ws) send(p,{type:'stream-ended',from:ws.id});
    }
  });
  ws.on('close',()=>{if(!ws.room)return;const peers=rooms.get(ws.room);peers?.delete(ws.id);for(const p of peers?.values()||[])send(p,{type:'peer-left',id:ws.id});if(peers?.size===0)rooms.delete(ws.room);});
});
server.listen(port,'0.0.0.0',()=>console.log(`Web Stream signaling server listening on ${port}`));
