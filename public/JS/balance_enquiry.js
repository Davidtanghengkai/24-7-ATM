document.addEventListener("DOMContentLoaded", async () => {
    const accountNo = localStorage.getItem("selectedAccountNo");

    if (!accountNo) {
        alert("No account selected. Redirecting to login...");
        window.location.href = "LoginPage.html";
        return;
    }

    try {
        // Fetch balance from API
        const response = await fetch(`/api/accounts/${accountNo}/balance`);
        const data = await response.json();

        if (response.ok) {
            // Update UI
            document.getElementById("balance-amount").innerText = data.balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            
            // We can also fetch account details to show the type, but for now let's use the data we have
            document.getElementById("account-no-display").innerText = `Account No: **** **** ${accountNo.slice(-4) || accountNo}`;
            
            // Update timestamp
            const now = new Date();
            document.getElementById("timestamp-display").innerText = `As of ${now.toLocaleString()}`;
        } else {
            alert("Error fetching balance: " + (data.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to connect to the server.");
    }
});
