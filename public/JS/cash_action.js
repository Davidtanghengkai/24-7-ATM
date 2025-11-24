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

// DEPOSIT LOGIC
document.getElementById("deposit-confirm").addEventListener("click", async () => {

    const amount = Number(document.getElementById("deposit-amount").value);
    const accountNo = localStorage.getItem("selectedAccountNo");

    if (!accountNo) {
        alert("Account not found in local storage.");
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
            // SHOW SUCCESS MODAL
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

