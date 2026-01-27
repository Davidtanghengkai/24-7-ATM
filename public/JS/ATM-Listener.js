const ATM_ID = "ATM01"; 
const socket = io();

socket.on('connect', () => {
    console.log("Connected to server ID:", socket.id);
    socket.emit('join-station', ATM_ID);
});

socket.on('login-command', (data) => {performLogin(data);});
socket.on('nfc-error', (error) => {
    console.error("NFC Error:", error);
    alert('NFC Error: ' + error.message);});

socket.on('disconnect', () => {console.log("Disconnected from server");
});
socket.on('connect_error', (error) => {console.error("Connection error:", error);});


async function performLogin(data) {
    showLoginNotification(data);
    
    try {
        localStorage.setItem('jwtToken', data.jwtToken);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('selectedCardId', data.selectedCardId);
        localStorage.setItem('selectedAccountNo', data.selectedAccountNo);
        console.log("Session data stored locally.");
        
        setTimeout(() => {
            window.location.href = 'NewHomePage.html';
        }, 2000);
        
    } catch (error) {
        console.error("Session transfer failed:", error);
        showErrorNotification("Transfer failed: " + error.message);
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('selectedCardId');
        localStorage.removeItem('selectedAccountNo');

        setTimeout(() => {
            window.location.href = 'LoginPage.html';
        }, 2000);
    }
}


function showLoginNotification(data) {
    const existing = document.getElementById('nfc-login-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'nfc-login-notification';
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 40px 50px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        animation: scaleIn 0.3s ease-out;
        min-width: 400px;
    `;
    
    const cardLast4 = data.selectedCardId ? String(data.selectedCardId).slice(-4) : '****';
    
    notification.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">📱✓</div>
        <h2 style="margin: 0 0 15px 0; font-size: 28px;">Session Transferred</h2>
        <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>User:</strong> ${data.userName || 'User'}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>User ID:</strong> ${data.userId}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Card:</strong> **** ${cardLast4}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Account:</strong> ${data.selectedAccountNo || 'Not selected'}</p>
        </div>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.9;">Loading your account...</p>
        <div class="loading-bar" style="
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 2px;
            margin-top: 15px;
            overflow: hidden;
        ">
            <div style="
                width: 100%;
                height: 100%;
                background: white;
                animation: loadingBar 2s ease-in-out;
            "></div>
        </div>
    `;
    
    document.body.appendChild(notification);
}

function showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        padding: 40px 50px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        animation: scaleIn 0.3s ease-out;
        min-width: 400px;
    `;
    notification.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">❌</div>
        <h2 style="margin: 0 0 15px 0; font-size: 24px;">Transfer Failed</h2>
        <p style="margin: 10px 0; font-size: 16px;">${message}</p>
        <p style="margin-top: 20px; font-size: 14px; opacity: 0.9;">Redirecting to manual login...</p>
    `;
    document.body.appendChild(notification);
}
console.log("ATM-Listener ready");