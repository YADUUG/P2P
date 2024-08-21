const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

const ws = new WebSocket(`ws://${window.location.host}`);
let localStream;
let peerConnection;
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Get user media (audio/video)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch(error => console.error('Error accessing media devices.', error));

// Handle incoming WebSocket messages
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'offer':
            handleOffer(data.offer);
            break;
        case 'answer':
            handleAnswer(data.answer);
            break;
        case 'candidate':
            handleCandidate(data.candidate);
            break;
    }
};

// Send signaling messages
function sendToServer(message) {
    ws.send(JSON.stringify(message));
}

// Create a new RTCPeerConnection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(config);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendToServer({ type: 'candidate', candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

// Handle Offer
function handleOffer(offer) {
    createPeerConnection();
    peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => {
            return peerConnection.createAnswer();
        })
        .then(answer => {
            return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
            sendToServer({ type: 'answer', answer: peerConnection.localDescription });
        });
}

// Handle Answer
function handleAnswer(answer) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

// Handle ICE Candidate
function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// Handle user message sending
sendButton.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim()) {
        sendToServer({ type: 'message', message: message });
        chatBox.innerHTML += `<div><b>You:</b> ${message}</div>`;
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});
