const accountModel = require('../Models/accountModel');


async function fetchBalance(req, res) {
    try {
        const { accountNo } = req.params;
        const balance = await accountModel.getBalance(accountNo);

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

        const success = await accountModel.updateBalance(accountNo, amount);

        if (!success) {
            return res.status(404).json({ message: "Account not found or update failed" });
        }

        res.json({ message: "Balance updated successfully" });
    } catch (err) {
        console.error("Controller error (updateAccountBalance):", err.message);
        res.status(500).json({ error: "Failed to update balance" });
    }       
}

async function getAccountsByUserId(req, res) {
    const userId = parseInt(req.params.userId);
    try {
        const accounts = await accountModel.getAccountsByUserId(userId);
        res.status(200).json(accounts);
    } catch (err) {
        console.error("Error in userController.getAccountsByUserId:", err);
        res.status(500).json({ message: "Internal server error, Failed to get accounts for user" });
    }
}

async function createAccount(req, res) {
    const accountData = req.body;
    try {
        const newAccountNo = await accountModel.createAccount(accountData);
        res.status(201).json({ message: "Account created successfully", accountNo: newAccountNo });
    } catch (err) {
        console.error("Error in userController.createAccount:", err);
        res.status(500).json({ message: "Internal server error, Failed to create account" });
    }
}

async function addBalance(req, res) {
  try {
    const { accountNo, amount } = req.body;

    // 1. Validate request
    if (!accountNo || !amount) {
      return res.status(400).json({ message: "Missing accountNo or amount" });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // 2. Call model
    const success = await accountModel.increaseBalance(accountNo, amount);

    if (!success) {
      return res.status(404).json({ message: "Account not found" });
    }

    // 3. Success
    return res.status(200).json({
      message: "Balance updated successfully (deposit added)",
      accountNo,
      amount
    });

  } catch (error) {
    console.error("Controller Error (addBalance):", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
    getAccountsByUserId,
    createAccount, fetchBalance, updateAccountBalance, addBalance
};
