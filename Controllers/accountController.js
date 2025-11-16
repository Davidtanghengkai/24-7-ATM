const { getBalance, updateBalance } = require("../Models/accountModel");

async function fetchBalance(req, res) {
    try {
        const { accountNo } = req.params;
        const balance = await getBalance(accountNo);

        if (balance === null) {
            return res.status(404).json({ message: "Account not found" });
        }
        res.json({ accountNo, balance });
    } catch (err) {
        console.error("Controller error (fetchBalance):", err.message);
        res.status(500).json({ error: "Failed to fetch balance" });
    }   
}

async function updateAccountBalance(req, res) {
    try {
        const { accountNo , amount } = req.body;
       
        if (!accountNo || !amount) {
            return res.status(400).json({ error: "Invalid input data" });
        }

        const success = await updateBalance(accountNo, amount);

        if (!success) {
            return res.status(404).json({ message: "Account not found or update failed" });
        }

        res.json({ message: "Balance updated successfully" });
    } catch (err) {
        console.error("Controller error (updateAccountBalance):", err.message);
        res.status(500).json({ error: "Failed to update balance" });
    }       
}

module.exports = { fetchBalance, updateAccountBalance };