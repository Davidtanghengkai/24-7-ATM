const accountModel = require('../Models/accountModel');

async function getAccountsByUserId(req, res) {
    const userId = parseInt(req.params.userId);
    try {
        const accounts = await userModel.getAccountsByUserId(userId);
        res.status(200).json(accounts);
    } catch (err) {
        console.error("Error in userController.getAccountsByUserId:", err);
        res.status(500).json({ message: "Internal server error, Failed to get accounts for user" });
    }
}

async function createAccount(req, res) {
    const accountData = req.body;
    try {
        const newAccountNo = await userModel.createAccount(accountData);
        res.status(201).json({ message: "Account created successfully", accountNo: newAccountNo });
    } catch (err) {
        console.error("Error in userController.createAccount:", err);
        res.status(500).json({ message: "Internal server error, Failed to create account" });
    }
}

module.exports = {
    getAccountsByUserId,
    createAccount
};