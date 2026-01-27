const ATM_ID = "ATM01"; 
const socket = io();


socket.on('connect', () => {
    console.log("Connected to server! Joining station:", ATM_ID);
    socket.emit('join-station', ATM_ID);
});

socket.on('login-command', (data) => {
    console.log("Login received!", data);
    performLogin(data);
});