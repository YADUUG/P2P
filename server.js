const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('client'));

let waitingClient = null;

wss.on('connection', (ws) => {
    console.log('New client connected');

    if (waitingClient) {
        // Pair with the waiting client
        ws.partner = waitingClient;
        waitingClient.partner = ws;
        waitingClient = null;

        ws.send(JSON.stringify({ type: 'info', message: 'You are now connected to a random stranger!' }));
        ws.partner.send(JSON.stringify({ type: 'info', message: 'You are now connected to a random stranger!' }));
    } else {
        // No one is waiting, make this client wait
        waitingClient = ws;
        ws.send(JSON.stringify({ type: 'info', message: 'Waiting for a stranger to connect...' }));
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (ws.partner) {
            ws.partner.send(JSON.stringify(data));
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (ws.partner) {
            ws.partner.send(JSON.stringify({ type: 'info', message: 'Stranger has disconnected.' }));
            ws.partner.partner = null;
        } else if (waitingClient === ws) {
            waitingClient = null;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
