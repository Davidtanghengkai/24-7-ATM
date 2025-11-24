/* ===============================
   LOAD USER ACCOUNTS
================================ */

document.addEventListener("DOMContentLoaded", loadAccounts);

let selectedAccountNo = null;

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
            selectAccountButton(acc.AccountNo);
        });

    } catch (error) {
        console.error("Error loading accounts:", error);
    }
}

async function selectAccountButton(accountNo) {
    const area = document.getElementById(`cards-${accountNo}`);

            const btn = document.createElement("button");
            btn.classList.add("card-btn");
            btn.textContent = "Select Account";
            btn.onclick = () => selectAccount(accountNo);
            area.appendChild(btn);
}

/* ===============================
   SELECT ACCOUNT → OPEN PIN MODAL
================================ */

function selectAccount(accountNo) {
    selectedAccountNo = accountNo;
    localStorage.setItem("selectedAccountNo", accountNo);

    document.getElementById("pin-modal").style.display = "flex";
}

/* ===============================
   SUBMIT PIN → CREATE CARD
================================ */
document.addEventListener("click", (e) => {
    if (e.target.id === "createCard") {
        submitCardPIN();
    }
});


async function submitCardPIN() {
    
    const pin = document.getElementById("new-card-pin").value.trim();
    const userId = localStorage.getItem("userId");

    if (!pin || pin.length !== 6) {
        alert("PIN must be 6 digits.");
        return;
    }
    console.log("Creating card for account:", pin);
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 5);

    const res = await fetch("/api/cards", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            userId,
            accountNo: selectedAccountNo,
            expiryDate: expiry.toISOString(),
            pin
        })
    });
    console.log("Create card response status:", res.status);
    const card = await res.json();
    console.log("Create card response:", card);
    await new Promise(resolve => setTimeout(resolve, 1000)); // slight delay
    if (res.ok) {
        console.log("Card created successfully:", card);
        localStorage.setItem("selectedCardId", card.card.CardNo);
        setTimeout(() => {
            window.location.href = "NewHomePage.html";
        }, 500);
    } else {
        alert("Error creating card: " + card.message);
    }
}
