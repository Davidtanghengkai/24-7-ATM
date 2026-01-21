document.addEventListener("DOMContentLoaded", () => {
    loadAccounts();
});

// -------------------------------------------
// LOAD ACCOUNTS (BUTTONS ONLY)
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

        accounts.forEach((acc, index) => {
            const btn = document.createElement("button");
            btn.classList.add("account-button");
            if (index === 0) btn.classList.add("active");

            btn.innerHTML = `<b>Account ${index + 1}</b>`;
            btn.onclick = () => selectAccount(acc, btn);

            container.appendChild(btn);

            // auto-load first account
            if (index === 0) {
                loadAccountDetails(acc);
            }
        });

    } catch (error) {
        console.error("Error loading accounts:", error);
    }
}

// -------------------------------------------
// HANDLE ACCOUNT SELECTION
// -------------------------------------------
function selectAccount(acc, clickedBtn) {
    document
        .querySelectorAll(".account-button")
        .forEach(btn => btn.classList.remove("active"));

    clickedBtn.classList.add("active");
    loadAccountDetails(acc);
}

// -------------------------------------------
// LOAD ACCOUNT DETAILS
// -------------------------------------------
function loadAccountDetails(acc) {
    const details = document.getElementById("account-details");

    details.innerHTML = `
        <h2 class="account-no">Account No: ${acc.AccountNo}</h2>
        <h3 class="account-type">Account type: ${acc.Type}</h3>
        <h3 class="account-balance">Balance: $${acc.Balance.toFixed(2)}</h3>

        <h2 class="cards-title"><i>Select Card</i></h2>
        <div class="cards-container" id="cards-container">
            <div class="cards-grid" id="cards-grid"></div>
        </div>
    `;

    loadCards(acc.AccountNo);
}

// -------------------------------------------
// LOAD CARDS FOR SELECTED ACCOUNT
// -------------------------------------------
async function loadCards(accountNo) {
    const userId = localStorage.getItem("userId");

    try {
        const res = await fetch(`/api/cards/active/user/${userId}/account/${accountNo}`);
        const cards = await res.json();

        const grid = document.getElementById("cards-grid");
        grid.innerHTML = "";

        if (cards.length === 0) {
            grid.innerHTML = "<p>No active cards found.</p>";
            return;
        }

        cards.forEach(card => {
            const btn = document.createElement("button");
            btn.classList.add("card-button");
            btn.innerHTML = `<b><i>${card.CardName}</i></b>`;

            btn.onclick = () => selectCard(card.CardNo, accountNo, card.PIN);
            grid.appendChild(btn);
        });

    } catch (error) {
        console.error("Error loading cards:", error);
    }
}

// -------------------------------------------
// SAVE SELECTED ACCOUNT + CARD IF CORRECT PIN
// -------------------------------------------

const pinInput = document.getElementById("card-pin");
const pinError = document.getElementById("pin-error");

let currentSelection = null;   // store card info here
const pinModal = document.getElementById('pin-modal');

pinModal.addEventListener('click', e => {
    if (e.target === pinModal){
        document.getElementById("pin-modal").style.display = "none"
    };
});

// Escape key to close
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.getElementById("pin-modal").style.display = "none"
    };
});


function selectCard(cardId, accountNo, pin) {
    currentSelection = { cardId, accountNo, pin, attempts: 0 };

    pinInput.value = "";
    pinError.textContent = "";

    document.getElementById("pin-modal").style.display = "flex";

};

document.getElementById("confirmPin").addEventListener("click", (e) => {
    e.preventDefault();
    if (!currentSelection) return;

    const enteredPin = pinInput.value;
    const { cardId, accountNo, pin } = currentSelection;

    if (enteredPin !== pin) {
        currentSelection.attempts++;
        pinError.textContent = "Incorrect PIN. Please try again.";
        pinInput.value = "";

        if (currentSelection.attempts >= 3) {
            pinError.textContent = "Maximum attempts reached.";
            document.getElementById("confirmPin").disabled = true;
        }
        return;
    }

    localStorage.setItem("selectedCardId", cardId);
    localStorage.setItem("selectedAccountNo", accountNo);

    window.location.href = "NewHomePage.html";
});
