import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:4000/');

ws.on('open', () => {
  console.log('WS Connection Opened Successfully!');
  ws.send(JSON.stringify({ type: 'join', userId: 'user123' }));
});

ws.on('message', (msg) => {
  console.log('Message received:', msg.toString());
});

ws.on('error', (err) => {
  console.error('WS Error:', err);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log('WS Closed:', code, reason.toString());
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout reached, closing');
  ws.close();
}, 2000);
