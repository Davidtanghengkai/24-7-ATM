const socket = io();
function sendAction(actionType) {
    socket.emit('phone_button_click', { action: actionType });
}