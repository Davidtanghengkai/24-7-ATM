document.addEventListener("DOMContentLoaded", () => {
    loadAccounts();
});

// ------------------------------
// LOAD ACCOUNTS BY USER ID
// ------------------------------
async function loadAccounts() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        alert("User not logged in.");
        return;
    }

    try {
        const res = await fetch(`/api/accounts/user/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch accounts");
        const accounts = await res.json();

        const container = document.getElementById("account-container");
        container.innerHTML = "";

        accounts.forEach(acc => {
            const box = document.createElement("div");
            box.classList.add("account-box");

            const balance = typeof acc.Balance === "number" ? acc.Balance : 0;
            const accountType = acc.Type;
            const cardsListId = `cards-${acc.AccountNo}`;

            box.innerHTML = `
                <div class="account-info">
                    <h3>${accountType}</h3>
                    <p>Account No: ${acc.AccountNo}</p>
                    <p>Balance: $${balance.toFixed(2)}</p>
                </div>

                <button class="select-card-btn" onclick="loadCards(${acc.AccountNo})">
                    View Cards
                </button>

                <div class="cards-list" id="${cardsListId}"></div>
            `;

            container.appendChild(box);
        });
    } catch (error) {
        console.error("Error loading accounts:", error);
        alert("Error loading accounts. Check console.");
    }
}

// ------------------------------
// LOAD CARDS FOR ACCOUNT
// ------------------------------
async function loadCards(accountNo) {
    const userId = localStorage.getItem("userId");

    if (!accountNo) {
        console.error("AccountNo is undefined");
        return;
    }

    try {
        const res = await fetch(`/api/cards/active/user/${userId}/account/${accountNo}`);
        if (!res.ok) throw new Error("Failed to fetch cards");
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
                <p>Card No: ${card.CardNo}</p>
                <button onclick="selectCard(${card.CardNo}, ${accountNo})">
                    Select This Card
                </button>
            `;

            area.appendChild(cardDiv);
        });
    } catch (error) {
        console.error("Error loading cards:", error);
    }
}
// ------------------------------
// SELECT ACCOUNT + CARD
// ------------------------------
function selectCard(cardNo, accountNo) {
    localStorage.setItem("selectedCardId", cardNo);
    localStorage.setItem("selectedAccountNo", accountNo);
    alert(`Selected Card: ${cardNo} for Account: ${accountNo}`);
    // Optionally redirect
    window.location.href = "NewHomePage.html";
}