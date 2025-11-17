const userModel = require('../Models/userModel');

async function getAllUsers(req, res) { //gets all users if needed
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json(users);
    } catch (err) { //general error handling
        console.error("Error in userController.getAllUsers:", err);
        res.status(500).json({ message: "Internal server error, Failed to get all users" });
    }
}

async function getUserById(req, res) {
    const userId = parseInt(req.params.id);
    try {
        const user = await userModel.getUserById(userId);
        if (user) { //checks if user exists in database before returning
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: "User not found in the database" });
        }
    } catch (err) {
        console.error("Error in userController.getUserById:", err);
        res.status(500).json({ message: "Internal server error, Failed to get user" });
    }
}

async function getAllBiometrics(req, res) {
    try {
        const biometrics = await userModel.getAllBiometrics(); //get all biometrics for face scannign function
        res.status(200).json(biometrics);
    } catch (err) {
        console.error("Error in userController.getAllBiometrics:", err);
        res.status(500).json({ message: "Internal server error, Failed to get all biometrics" });
    }
}

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

async function getCardsByUserIdandAccountId(req, res) {
    const userId = parseInt(req.params.userId);
    const accountNo = parseInt(req.params.accountNo);
    try {
        const cards = await userModel.getCardsByUserIdandAccountId(userId, accountNo);
        res.status(200).json(cards);
    } catch (err) {
        console.error("Error in userController.getCardsByUserIdandAccountId:", err);
        res.status(500).json({ message: "Internal server error, Failed to get cards for user account" });
    }
}

async function createUser(req, res) {
    const userData = req.body;
    try {
        const newUserId = await userModel.createUser(userData);
        res.status(201).json({ message: "User created successfully", userId: newUserId });
    } catch (err) {
        console.error("Error in userController.createUser:", err);
        res.status(500).json({ message: "Internal server error, Failed to create user" });
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

async function createCard(req, res) {
    const cardData = req.body;
    try {
        const newCardNo = await userModel.createCard(cardData);
        res.status(201).json({ message: "Card created successfully", cardNo: newCardNo });
    }
    catch (err) {
        console.error("Error in userController.createCard:", err);
        res.status(500).json({ message: "Internal server error, Failed to create card" });
    }
}



module.exports = {
    getAllUsers,
    getUserById,
    getAllBiometrics,
    getAccountsByUserId,
    getCardsByUserIdandAccountId,
    createUser,
    createAccount,
    createCard
};