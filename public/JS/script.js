const socket = io('/');
// 1. We don't need videoGrid anymore because we have specific containers
const myPeer = new Peer(undefined, {
    host: location.hostname,
    port: location.port || 3000,
    path: '/peerjs'
});

const myVideo = document.createElement('video');
myVideo.muted = true;
const peers = {};

// 2. CRITICAL: Define this at the top so the function can see it
let myLocalStream; 
const ROOM_ID = "teller-room"; // Ensure this matches your server logic

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
}).then(stream => {
    myLocalStream = stream; // 3. Save your stream here
    addVideoStream(myVideo, stream);

    myPeer.on('call', call => {
        call.answer(stream)
        const video = document.createElement('video')
        call.on('stream', userVideoStream => {
            addVideoStream(video, userVideoStream)
        })
    })

    socket.on('user-connected', userId => {
        connectToNewUser(userId, stream)
    })
})

socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
})

myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id);
})

function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream);
    const video = document.createElement('video');

    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        video.remove();
    })

    peers[userId] = call;
}

function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });

    // 4. SMART DETECTION: Checks if the stream is yours or the other person's
    if (myLocalStream && stream.id === myLocalStream.id) {
        const localContainer = document.getElementById('local-video-container');
        if (localContainer) localContainer.append(video);
    } else {
        const remoteContainer = document.getElementById('remote-video-container');
        if (remoteContainer) {
            // Clears any old video to keep the 1-on-1 look
            remoteContainer.querySelectorAll('video').forEach(v => v.remove());
            remoteContainer.append(video);
        }
    }
}