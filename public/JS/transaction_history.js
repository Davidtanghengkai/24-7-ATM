document.addEventListener("DOMContentLoaded", async () => {
    const accountNo = localStorage.getItem("selectedAccountNo");

    if (!accountNo) {
        alert("No account selected. Redirecting to login...");
        window.location.href = "LoginPage.html";
        return;
    }

    document.getElementById("account-display").innerText = `Account No: **** **** ${accountNo.slice(-4) || accountNo}`;

    try {
        const response = await fetch(`/api/accounts/${accountNo}/transactions`);
        const transactions = await response.json();

        const body = document.getElementById("history-body");
        const noHistory = document.getElementById("no-history");

        if (transactions.length === 0) {
            noHistory.classList.remove("hidden");
            return;
        }

        noHistory.classList.add("hidden");

        transactions.forEach(tx => {
            const row = document.createElement("tr");
            
            const date = new Date(tx.timestamp).toLocaleString();
            const amountClass = tx.displayAmount < 0 ? "amount-negative" : "amount-positive";
            const amountText = (tx.displayAmount < 0 ? "-" : "+") + "$" + Math.abs(tx.displayAmount).toFixed(2);
            
            const typeClass = `type-badge type-${(tx.txnType || 'overseas').toLowerCase()}`;

            row.innerHTML = `
                <td>${date}</td>
                <td><span class="${typeClass}">${tx.txnType || 'Overseas'}</span></td>
                <td>${tx.reference || 'N/A'}</td>
                <td class="text-right ${amountClass}">${amountText}</td>
            `;
            body.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching history:", error);
        alert("Failed to load transaction history.");
    }
});
