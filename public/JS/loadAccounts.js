document.addEventListener('DOMContentLoaded', async () => {
    
    const userId = localStorage.getItem("userId");

    if (!userId) {
        console.warn("No User ID found in localStorage.");
        document.querySelector('.account-container').innerHTML = '<p style="color:red;">Please Login First</p>';
        return;
    }

    const container = document.querySelector('.account-container');
    container.innerHTML = '<p style="color:#666; margin-top:20px;">Loading accounts...</p>';

    try {
        // 1. FETCH ACCOUNTS
        const accountResponse = await fetch(`/api/accounts/user/${userId}`);
        if (!accountResponse.ok) throw new Error(`Failed to fetch accounts`);
        const accounts = await accountResponse.json();

        container.innerHTML = '';

        if (!accounts || accounts.length === 0) {
            container.innerHTML = '<p>No accounts found.</p>';
            return;
        }

        // 2. LOOP THROUGH ACCOUNTS
        for (const account of accounts) {
            const box = document.createElement('div');
            box.className = 'account-box';
            box.style.flexShrink = "0"; 

            let icon = '💰'; 
            const typeLower = account.accountType ? account.accountType.toLowerCase() : '';
            if (typeLower.includes('current')) icon = '💼';
            if (typeLower.includes('crypto')) icon = '🪙';

            // 3. FETCH CARDS
            let actionsHtml = ''; // Renamed from buttonsHtml to reflect it might be text
            
            try {
                const cardResponse = await fetch(`/api/cards/active/user/${userId}/account/${account.accountNo}`);
                
                if (cardResponse.ok) {
                    const cards = await cardResponse.json();
                    
                    if (Array.isArray(cards) && cards.length > 0) {
                        // Case A: User has cards -> Show Selection Buttons
                        actionsHtml = cards.map(card => {
                            const displayNum = card.CardNo ? String(card.CardNo).slice(-4) : '####';
                            return `<button class="select-card-btn" onclick="viewCard('${card.CardNo}')">
                                Card *${displayNum}
                            </button>`;
                        }).join('');
                    } else {
                        // Case B: Account exists, but NO cards linked -> Show Message
                        actionsHtml = `<span style="color:#999; font-style:italic;">No active cards</span>`;
                    }
                } else {
                    actionsHtml = `<span style="color:#999; font-style:italic;">No active cards</span>`;
                }
            } catch (err) {
                console.warn(`Error fetching cards for account ${account.accountNo}`, err);
                actionsHtml = `<span style="color:red; font-size:0.8rem;">Error loading cards</span>`;
            }

            // 4. RENDER
            box.innerHTML = `
                <div class="account-info">
                    <div class="box-icon">${icon}</div>
                    <div class="text-details">
                        <h3>${account.accountType || 'Account'}</h3>
                        <span class="box-desc">Acc No: ${account.accountNo}</span>
                        <span class="box-desc" style="font-size: 0.9rem; color: #134c5f;">
                            Bal: $${formatBalance(account.balance)}
                        </span>
                    </div>
                </div>

                <div class="card-actions">
                    ${actionsHtml}
                </div>
            `;

            container.appendChild(box);
        }

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = '<p style="color:red; padding:20px;">System Error: Could not load data.</p>';
    }
});

function formatBalance(amount) {
    return amount ? parseFloat(amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00';
}

function viewCard(cardNo) {
    console.log("Selected card:", cardNo);
    localStorage.setItem('selectedCardNo', cardNo);

}