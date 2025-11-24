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

        console.log("Loaded accounts:", accounts);

        accounts.forEach(acc => {
            const box = document.createElement("div");
            box.classList.add("account-box");

            box.innerHTML = `
                <div class="account-block">
                    <div class="account-left">
                        <h3>${acc.Type}</h3>
                        <p>Account No: ${acc.AccountNo}</p>
                        <p>Balance: $${acc.Balance.toFixed(2)}</p>
                    </div>

                    <div class="account-right" id="cards-${acc.AccountNo}">
                        <!-- Cards inserted here -->
                    </div>
                </div>
            `;

            container.appendChild(box);
            loadCards(acc.AccountNo);
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
            const btn = document.createElement("button");
            btn.classList.add("card-btn");
            btn.textContent = card.CardName;
            btn.onclick = () => selectCard(card.CardNo, accountNo, card.PIN);
            area.appendChild(btn);
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
