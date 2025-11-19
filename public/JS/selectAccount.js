/* ===============================
   LOAD USER ACCOUNTS
================================ */

document.addEventListener("DOMContentLoaded", loadAccounts);

let selectedAccountNo = null;

async function loadAccounts() {
    const userId = localStorage.getItem("userId");

    const res = await fetch(`/api/accounts/user/${userId}`);
    const accounts = await res.json();

    const container = document.getElementById("account-container");
    container.innerHTML = "";

    accounts.forEach(acc => {
        const div = document.createElement("div");
        div.classList.add("account-box");
        div.innerHTML = `
            <h3>${acc.accountType}</h3>
            <p>Account No: ${acc.accountNo}</p>
            <button onclick="selectAccount(${acc.accountNo})">Use This Account</button>
        `;
        container.appendChild(div);
    });
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

async function submitCardPIN() {
    const pin = document.getElementById("new-card-pin").value.trim();
    const userId = localStorage.getItem("userId");

    if (!pin || pin.length !== 6) {
        alert("PIN must be 6 digits.");
        return;
    }

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

    const card = await res.json();

    if (res.ok) {
        localStorage.setItem("selectedCardId", card.cardId);
        window.location.href = "NewHomePage.html";
    } else {
        alert("Error creating card: " + card.message);
    }
}
