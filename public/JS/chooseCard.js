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

    if (acc.Status !== 'Active') {
        details.classList.add("disabled");
        details.innerHTML = `<h2 class="account-no">Account No: ${acc.AccountNo}</h2>
        <h3 class="account-type">Account type: ${acc.Type}</h3>
        <h3 class="account-balance">Balance: $${acc.Balance.toFixed(2)}</h3>
        <p style="color:red;"><i>This account is not active. Please select another account.</i></p>`;
    }
    else{
        details.innerHTML = `
            <div class="account-info">
                <div class=account-info-left>
                    <h2 class="account-no">Account No: ${acc.AccountNo}</h2>
                    <h3 class="account-type">Account type: ${acc.Type}</h3>
                    <h3 class="account-balance">Balance: $${acc.Balance.toFixed(2)}</h3>
                </div>
                <div class="account-info-right">
                <button class="freezeAccount" id="freeze-btn">Freeze Account</button>
                </div>
            </div>

            <h2 class="cards-title"><i>Select Card</i></h2>
            <div class="cards-container" id="cards-container">
                <div class="cards-grid" id="cards-grid"></div>
            </div>
        `;
    }

    loadCards(acc.AccountNo, acc.Status);
}

// -------------------------------------------
// LOAD CARDS FOR SELECTED ACCOUNT
// -------------------------------------------
async function loadCards(accountNo, accountStatus) {
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

        if (accountStatus !== 'Active') {
            cards.forEach(card => {
                const btn = document.createElement("button");
                btn.classList.add("card-button");
                btn.disabled = true;
                btn.innerHTML = `<b><i>${card.CardName}</i></b>`;

                btn.onclick = () => selectCard(card.CardNo, accountNo, card.PIN);
                grid.appendChild(btn);
            });
        }
        else{
            cards.forEach(card => {
                const btn = document.createElement("button");
                btn.classList.add("card-button");
                btn.innerHTML = `<b><i>${card.CardName}</i></b>`;

                btn.onclick = () => selectCard(card.CardNo, accountNo, card.PIN);
                grid.appendChild(btn);
            });
        }
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


let currentAccountToFreeze = null;
let freezeMode = "single"; // "single" or "all"

const generateAuthCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

document.addEventListener("click", (e) => {
    // freeze 1 account
    if (e.target && e.target.id === "freeze-btn") {
        freezeMode = "single";
        const accountNoElement = document.querySelector(".account-no");
        const match = accountNoElement.textContent.match(/\d+/); //get account number
        currentAccountToFreeze = match ? match[0] : null;
        openFreezeModal("Freeze Account " + currentAccountToFreeze);
    }

    // freeze all
    if (e.target && (e.target.id === "freeze-all-btn" || e.target.classList.contains("freezeAll"))) {
        freezeMode = "all";
        openFreezeModal("Freeze All Accounts");
    }
});

// confirmation modal display
function openFreezeModal(titleText) {
    document.querySelector("#code-modal h2").textContent = titleText;
    document.getElementById("code-display").textContent = generateAuthCode();
    document.getElementById("code-error").textContent = "";
    document.getElementById("auth-code").value = "";
    document.getElementById("code-modal").style.display = "flex";
}

// confirm freeze action logic
document.getElementById("confirmCode").addEventListener("click", async (e) => {
    e.preventDefault();

    const enteredCode = document.getElementById("auth-code").value;
    const displayedCode = document.getElementById("code-display").textContent;
    const userId = localStorage.getItem("userId");

    if (enteredCode !== displayedCode) {
        document.getElementById("code-error").textContent = "Incorrect code.";
        return;
    }

    try {
        let url = "";
        if (freezeMode === "single") {
            url = `/api/accounts/freeze/${currentAccountToFreeze}`;
        } else {
            url = `/api/accounts/freeze-all/${userId}`;
        }

        const res = await fetch(url, { method: "PUT" });

        if (res.ok) {
            document.getElementById("code-error").textContent = (freezeMode === "single" ? "Account frozen." : "All accounts have been frozen.");
            location.reload();
        } else {
            const errorData = await res.json();
            document.getElementById("code-error").textContent = errorData.message || "Failed to process.";
        }
    } catch (error) {
        console.error("Error:", error);
        document.getElementById("code-error").textContent ="Server communication error.";
    }
});

//close if model is clicked out
window.addEventListener('click', function(event) {
    const modal = document.getElementById("code-modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
});
