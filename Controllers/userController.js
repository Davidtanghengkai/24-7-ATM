const userModel = require('../Models/userModel');

// POST /user
async function createUser(req, res) {
    const userData = req.body;
    console.log("Incoming userData:", userData);
    try {
        const newUserId = await userModel.createUser(userData);
        res.status(201).json({ message: "User created successfully", userId: newUserId });
    } catch (err) {
        console.error("Error in userController.createUser:", err);
        res.status(500).json({ message: "Internal server error, Failed to create user" });
    }
}


// GET /user/:id
async function getUserById(req, res) {
    //Parse and Validate ID
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const user = await userModel.getUserById(id); //get user by id

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);

    } catch (err) {
        console.error("Error in getUserById controller:", err);
        res.status(500).json({ message: "Error getting user", error: err.message });
    }
}

// GET /user/
async function getAllUsers(req, res) { //gets all users if needed
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json(users);
    } catch (err) {  //general error handling
        console.error("Error in getAllUsers controller:", err);
        res.status(500).json({ message: "Error getting all users", error: err.message });
    }
}


async function findUserByEmail(req, res) {
    // 1. Get email from query string
    const { email } = req.query; 

    // 2. Validate input
    if (!email) {
        return res.status(400).json({ message: "Email query parameter is required" });
    }

    try {
        const user = await userModel.findUserByEmail(email);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);

    } catch (err) {
        // 3. Server-side logging
        console.error("Error in findUserByEmail controller:", err);
        res.status(500).json({ message: "Error finding user", error: err.message });
    }
}


async function getAllBiometrics(req, res) { //create biometric MVC
    try {
        const biometrics = await userModel.getAllBiometricsWithUser(); //get all biometrics for face scanning function
        return res.status(200).json(biometrics);
    } catch (err) {
        console.error("Error in userController.getAllBiometrics:", err);
        res.status(500).json({ message: "Internal server error, Failed to get all biometrics" });
    }
}


module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    findUserByEmail,
    getAllBiometrics
};