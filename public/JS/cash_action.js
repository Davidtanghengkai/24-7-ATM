const withdrawBtn = document.getElementById("withdraw-btn");
const depositBtn = document.getElementById("deposit-btn");

const leftOverlay = document.getElementById("left-overlay");
const withdrawSection = document.getElementById("withdraw-section");
const depositSection = document.getElementById("deposit-section");

// OPEN WITHDRAW OVERLAY
withdrawBtn.addEventListener("click", () => {
    leftOverlay.classList.add("visible");
    withdrawSection.classList.remove("hidden");
    depositSection.classList.add("hidden");
});

// OPEN DEPOSIT OVERLAY
depositBtn.addEventListener("click", () => {
    leftOverlay.classList.add("visible");
    withdrawSection.classList.add("hidden");
    depositSection.classList.remove("hidden");
});

// WITHDRAW LOGIC
const quickCashBtns = document.querySelectorAll(".quick-cash-grid .cash-btn");
const otherAmountBtn = document.getElementById("other-amount-btn");
const otherAmountDiv = document.getElementById("other-amount-div");
const otherAmountConfirm = document.getElementById("withdraw-other-confirm");
const otherAmountInput = document.getElementById("withdraw-other-amount");

const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmYes = document.getElementById("confirm-yes");
const confirmNo = document.getElementById("confirm-no");

let pendingWithdrawAmount = 0;

// Quick cash buttons
quickCashBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const amount = parseInt(btn.innerText.replace("$", ""));
        promptWithdraw(amount);
    });
});

// Other amount button
otherAmountBtn.addEventListener("click", () => {
    otherAmountDiv.classList.remove("hidden");
    otherAmountBtn.classList.add("hidden");
});

// Other amount confirm
otherAmountConfirm.addEventListener("click", () => {
    const amount = parseInt(otherAmountInput.value);
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }
    promptWithdraw(amount);
});

function promptWithdraw(amount) {
    pendingWithdrawAmount = amount;
    confirmMessage.innerText = `Are you sure you want to withdraw $${amount}?`;
    confirmModal.classList.remove("hidden");
}

confirmNo.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
});

confirmYes.addEventListener("click", async () => {
    confirmModal.classList.add("hidden");
    await executeWithdraw(pendingWithdrawAmount);
});

async function executeWithdraw(amount) {
    const accountNo = localStorage.getItem("selectedAccountNo");

    if (!accountNo) {
        alert("Account not found. Please log in again.");
        window.location.href = "LoginPage.html";
        return;
    }

    try {
        const res = await fetch("/api/accounts/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountNo, amount })
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById("success-title").innerText = "Withdrawal Successful!";
            document.getElementById("success-modal").classList.remove("hidden");
        } else {
            alert(data.message || "Insufficient balance or error.");
        }

    } catch (err) {
        console.error("Withdrawal error:", err);
        alert("Error processing withdrawal.");
    }
}

// DEPOSIT LOGIC
document.getElementById("deposit-confirm").addEventListener("click", async () => {
    const amount = Number(document.getElementById("deposit-amount").value);
    const accountNo = localStorage.getItem("selectedAccountNo");

    if (!accountNo) {
        alert("Account not found. Please log in again.");
        window.location.href = "LoginPage.html";
        return;
    }

    if (amount <= 0) {
        alert("Enter a valid deposit amount.");
        return;
    }

    try {
        const res = await fetch("/api/accounts/deposit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountNo, amount })
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById("success-title").innerText = "Deposit Successful!";
            document.getElementById("success-modal").classList.remove("hidden");
        } else {
            alert(data.message);
        }

    } catch (err) {
        console.error("Deposit error:", err);
        alert("Error processing deposit.");
    }
});

// Redirect based on user choice
document.getElementById("modal-yes").addEventListener("click", () => {
    window.location.href = "NewHomePage.html";   // Continue actions
});

document.getElementById("modal-no").addEventListener("click", () => {
    window.location.href = "TransactionCancel.html";  // End session
});

