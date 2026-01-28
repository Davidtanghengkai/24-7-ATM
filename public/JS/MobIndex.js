const socket = io(window.location.origin);
function sendAction(actionType) {
    socket.emit('phone_button_click', { action: actionType });
}