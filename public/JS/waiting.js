const ATM_ID = "ATM01";
const socket = io();

const userId = localStorage.getItem('userId');
const waitingTitle = document.getElementById('waiting-title');
const waitingDesc = document.getElementById('waiting-desc');
const statusBadge = document.getElementById('status-badge');
const denialMessage = document.getElementById('denial-message');
const mainSpinner = document.getElementById('main-spinner');
const statusIcon = document.getElementById('status-icon');

if (!userId) {
    console.error("No userId found in localStorage. Redirecting to login.");
    window.location.href = "LoginPage.html";
}

socket.on('connect', () => {
    console.log("Connected to server. Joining station:", ATM_ID);
    socket.emit('join-station', ATM_ID);
    
    // Notify server that this ATM is waiting for authentication for this user
    socket.emit('atm-waiting-auth', {
        stationId: ATM_ID,
        userId: userId
    });
});

socket.on('atm-auth-result', (data) => {
    console.log("Auth result received:", data);
    
    if (data.approved) {
        // Success! Redirect to chooseCard
        statusBadge.innerHTML = '<span style="color: #28a745;">✓ Approved! Redirecting...</span>';
        statusBadge.style.borderColor = '#28a745';
        statusBadge.style.background = 'rgba(40, 167, 69, 0.1)';
        
        setTimeout(() => {
            window.location.href = "chooseCard.html";
        }, 1500);
    } else {
        // Denied
        mainSpinner.style.display = 'none';
        statusIcon.style.display = 'block';
        waitingTitle.textContent = "Authentication Denied";
        waitingDesc.textContent = "The login request was rejected from your mobile device.";
        denialMessage.style.display = 'block';
        statusBadge.style.display = 'none';
    }
});

socket.on('disconnect', () => {
    console.log("Disconnected from server");
});

socket.on('connect_error', (error) => {
    console.error("Connection error:", error);
});
