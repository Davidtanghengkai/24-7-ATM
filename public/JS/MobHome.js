document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userName').innerText = localStorage.getItem('userName') || 'User';
    
    fetchUserAccounts();
});
const socket = io(window.location.origin);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userName').innerText = localStorage.getItem('userName') || 'User';
    fetchUserAccounts();
});
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('auth') === 'true') {
        const selectedCard = localStorage.getItem('activeNFCCard');

        if (selectedCard) {
            socket.on('connect', () => {
                console.log("Socket ready! Sending trigger...");
                
                socket.emit('nfc-trigger', {
                    stationId: "ATM01",
                    cardNo: selectedCard,
                    userName: localStorage.getItem('userName') || "User"
                });
                alert("Trigger sent for card " + selectedCard);
            });
        } else {
            alert("No card selected! Please pick a card first.");
        }
    }
});

// --- Unified Card Selection ---
function selectCardForNFC(cardNo, element) {
    document.querySelectorAll('.card-item').forEach(card => {
        card.style.border = "1px solid #eee";
        card.style.backgroundColor = "#ffffff";
    });
    
    element.style.border = "2px solid #d7191c"; 
    element.style.backgroundColor = "#fff5f5";

    localStorage.setItem('activeNFCCard', cardNo);
    console.log("Card prepared for NFC tap:", cardNo);

}

async function fetchUserAccounts() {
    const userId = localStorage.getItem('userId');
    const slider = document.getElementById('accountSlider');

    if (!userId) {
        console.error("No userId found in localStorage");
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
    }
}

async function handleNFCScan(stationId) {
    const selectedCard = localStorage.getItem('activeNFCCard');
    const userId = localStorage.getItem('userId');

    if (!selectedCard) {
        alert("Please select a card in the app first!");
        return;
    }

    const response = await fetch('/api/nfc/trigger-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userId,
            cardNo: selectedCard,
            stationId: stationId
        })
    });

    if (response.ok) {
        alert("Login command sent to PC!");
    }
}

function selectCardForNFC(cardNo, element) {
    document.querySelectorAll('.card-item').forEach(card => {
        card.style.border = "1px solid #eee";
        card.style.backgroundColor = "#ffffff";
    });
    
    element.style.border = "2px solid #d7191c"; 
    element.style.backgroundColor = "#fff5f5";

    localStorage.setItem('activeNFCCard', cardNo);
    
    console.log("NFC Login Card set to:", cardNo);
    

}

function logout() {
    localStorage.clear();
    window.location.href = '/mobile';
}