document.addEventListener("DOMContentLoaded", () => {
    loadAccounts();
});


// -------------------------------------------
// LOAD ACCOUNTS BY USER ID
// -------------------------------------------
async function loadAccounts() {
    const userId = localStorage.getItem("userId");

    if (!userId) {
        alert("User not logged in.");
        return;
    }

    try {
        const res = await fetch(`/api/accounts/user/${userId}`);
        const accounts = await res.json();

        const container = document.getElementById("account-container");
        container.innerHTML = "";

        accounts.forEach(acc => {
            const box = document.createElement("div");
            box.classList.add("account-box");

            box.innerHTML = `
                <div class="account-info">
                    <h3>${acc.accountType}</h3>
                    <p>Account No: ${acc.accountNo}</p>
                    <p>Balance: $${acc.balance.toFixed(2)}</p>
                </div>

                <button class="select-card-btn" onclick="loadCards(${acc.accountNo})">
                    View Cards
                </button>

                <div class="cards-list" id="cards-${acc.accountNo}"></div>
            `;

            container.appendChild(box);
        });

    } catch (error) {
        console.error("Error loading accounts:", error);
    }
}


// -------------------------------------------
// LOAD CARDS FOR USER + ACCOUNT
// -------------------------------------------
async function loadCards(accountNo) {
    const userId = localStorage.getItem("userId");

    try {
        const res = await fetch(`/api/cards/active/user/${userId}/account/${accountNo}`);
        const cards = await res.json();

        const area = document.getElementById(`cards-${accountNo}`);
        area.innerHTML = "";

        if (cards.length === 0) {
            area.innerHTML = `<p>No active cards found.</p>`;
            return;
        }

        cards.forEach(card => {
            const cardDiv = document.createElement("div");
            cardDiv.classList.add("card-item");

            cardDiv.innerHTML = `
                <p><strong>${card.cardType}</strong></p>
                <p>Card ID: ${card.cardId}</p>

                <button onclick="selectCard('${card.cardId}', ${accountNo})">
                    Select This Card
                </button>
            `;

            area.appendChild(cardDiv);
        });

    } catch (error) {
        console.error("Error loading cards:", error);
    }
}

// -------------------------------------------
// SAVE SELECTED ACCOUNT + CARD
// -------------------------------------------
function selectCard(cardId, accountNo) {
    localStorage.setItem("selectedCardId", cardId);
    localStorage.setItem("selectedAccountNo", accountNo);

    window.location.href = "NewHomePage.html";
}
