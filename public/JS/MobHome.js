document.addEventListener('DOMContentLoaded', () => {
    // Set user name
    document.getElementById('userName').innerText = localStorage.getItem('userName') || 'User';
    
    // Load accounts into the slider
    fetchUserAccounts();
});

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
                <div class="card-row">
                    <div class="card-icon-small">💳</div>
                    <div class="card-details">
                        <strong>${card.CardName}</strong>
                        <span>**** ${String(card.CardNo).slice(-4)} | ${card.status}</span>
                    </div>
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

function logout() {
    localStorage.clear();
    window.location.href = '/mobile';
}