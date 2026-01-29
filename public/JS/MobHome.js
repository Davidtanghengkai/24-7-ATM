const socket = io(window.location.origin);
document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName') || 'User';
    const userId = localStorage.getItem('userId');
    
    document.getElementById('userName').innerText = userName;
    fetchUserAccounts();
    setupSocketConnection();
    addTriggerButton();

    if (userId) {
        socket.emit('join-user', userId);
    }
});

function setupSocketConnection() {
    socket.on('connect', () => {
        console.log('Connected to server. Socket ID:', socket.id);
        const userId = localStorage.getItem('userId');
        if (userId) {
            socket.emit('join-user', userId);
        }
    });
    socket.on('disconnect', () => {console.log('Disconnected from server');});

    socket.on('nfc-sent', (data) => {showNotification('Session transferred to ATM!', 'success');});

    socket.on('nfc-error', (error) => {showNotification('Error: ' + error.message, 'error');});

    socket.on('connect_error', (error) => {showNotification('Connection error. Please check your network.', 'error');});

    // --- New Authentication Approval Listener ---
    socket.on('mobile-auth-request', (data) => {
        console.log('Authentication request received:', data);
        
        const modal = document.getElementById('auth-modal');
        const stationIdSpan = document.getElementById('modal-station-id');
        const approveBtn = document.getElementById('auth-approve');
        const denyBtn = document.getElementById('auth-deny');

        if (stationIdSpan) stationIdSpan.innerText = data.stationId;
        if (modal) modal.style.display = 'flex';

        const sendResponse = (approved) => {
            socket.emit('mobile-auth-response', {
                stationId: data.stationId,
                userId: data.userId,
                approved: approved
            });
            if (modal) modal.style.display = 'none';
            if (approved) {
                showNotification('Login approved!', 'success');
            } else {
                showNotification('Login denied.', 'warning');
            }
            // Clean up listeners to avoid multiple responses
            approveBtn.onclick = null;
            denyBtn.onclick = null;
        };

        if (approveBtn) approveBtn.onclick = () => sendResponse(true);
        if (denyBtn) denyBtn.onclick = () => sendResponse(false);
    });
}

function selectCardForNFC(cardNo, element) {
    document.querySelectorAll('.card-item').forEach(card => {
        card.style.border = "1px solid #eee";
        card.style.backgroundColor = "#ffffff";
    });

    element.style.border = "2px solid #d7191c"; 
    element.style.backgroundColor = "#fff5f5";

    localStorage.setItem('selectedCardId', cardNo);
    showNotification('Card selected. Ready to transfer!', 'info');
}

function triggerNFCLogin(stationId = "ATM01") {
    const selectedCard = localStorage.getItem('selectedCardId');
    const userName = localStorage.getItem('userName') || 'User';

    if (!selectedCard) {
        showNotification('Please select a card first!', 'warning');
        return;
    }

    if (!socket.connected) {
        showNotification('Not connected to server. Please wait...', 'error');
        return;
    }
    const sessionData = {
        jwtToken: localStorage.getItem('token') || localStorage.getItem('jwtToken'),
        userId: localStorage.getItem('userId'),
        selectedCardId: selectedCard,
        selectedAccountNo: localStorage.getItem('selectedAccountNo'),
        stationId: stationId,
        userName: userName,
    };
    socket.emit('nfc-trigger', sessionData);
    
    showNotification('Transferring to ATM...', 'info');
}

async function fetchUserAccounts() {
    const userId = localStorage.getItem('userId');
    const slider = document.getElementById('accountSlider');

    if (!userId) {
        console.error("No userId found in localStorage");
        slider.innerHTML = '<p>Please log in again.</p>';
        return;
    }
    try {
        const response = await fetch(`/api/accounts/user/${userId}`);
        const accounts = await response.json();

        if (response.ok && accounts.length > 0) {
            slider.innerHTML = accounts.map(acc => `
                <div class="account-card" onclick="selectAccount('${acc.AccountNo}', this)">
                    <div class="acc-type">${acc.Type}</div>
                    <div class="acc-balance">$${parseFloat(acc.Balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                </div>
            `).join('');
        } else {
            slider.innerHTML = '<p>No accounts found.</p>';
        }
    } catch (err) {
        console.error("Fetch error:", err);
        slider.innerHTML = '<p>Unable to load accounts.</p>';
    }
}

async function selectAccount(accountNo, element) {
    const userId = localStorage.getItem('userId');
    const emptyState = document.getElementById('emptyState');
    const cardList = document.getElementById('cardList');
    const statusText = document.getElementById('placeholderText');


    document.querySelectorAll('.account-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    localStorage.setItem('selectedAccountNo', accountNo);

    try {
        const response = await fetch(`/api/cards/active/user/${userId}/account/${accountNo}`);
        const cards = await response.json();

        if (response.ok && cards.length > 0) {
            emptyState.style.display = 'none';
            cardList.style.display = 'block';

            cardList.innerHTML = cards.map(card => `
                <div class="card-item" onclick="selectCardForNFC('${card.CardNo}', this)">
                    <div class="card-chip"></div>
                    <div class="card-info">
                        <span class="card-name">${card.CardName}</span>
                        <span class="card-number">**** ${String(card.CardNo).slice(-4)}</span>
                    </div>
                    <div class="card-status active">${card.status}</div>
                </div>
            `).join('');  
        } else {
            cardList.style.display = 'none';
            emptyState.style.display = 'block';
            statusText.innerText = "No active cards for this account.";
        }
    } catch (err) {
        console.error("Error fetching cards:", err);
        showNotification('Error loading cards', 'error');
    }
}

//Notifs
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out'; // Fixed animation name
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function logout() {
    localStorage.clear();
    window.location.href = '/mobile';
}
//NFC Trigger Button for testing
function addTriggerButton() {
    const triggerButton = document.createElement('button');
    triggerButton.textContent = '🔓 Transfer to ATM';
    triggerButton.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: #d7191c;
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 25px;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        cursor: pointer;
        z-index: 1000;
    `;
    
    triggerButton.onclick = () => triggerNFCLogin('ATM01');
    document.body.appendChild(triggerButton);
}