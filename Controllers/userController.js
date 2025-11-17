const userModel = require('../models/userModel');

// POST /user/create
async function createUser(req, res) {
    const { name, dob, nationalID } = req.body;
    
    // 1. Body validation
    if (!name || !dob || !nationalID) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const newUserID = await userModel.createUser({ name, dob, nationalID });
        res.status(201).json({ message: "User created", userID: newUserID });
    } catch (err) {
        // 2. Server-side logging
        console.error("Error in createUser controller:", err);
        res.status(500).json({ message: "Error creating user", error: err.message });
    }
}

// GET /user/:id
async function getUserById(req, res) {
    // 1. Parse and Validate ID
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const user = await userModel.getUserById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);

    } catch (err) {
        // 2. Server-side logging
        console.error("Error in getUserById controller:", err);
        res.status(500).json({ message: "Error getting user", error: err.message });
    }
}

// GET /user/
async function getAllUsers(req, res) {
    try {
        const users = await userModel.getAllUsers();
        res.status(200).json(users);
    } catch (err) {
        // Server-side logging
        console.error("Error in getAllUsers controller:", err);
        res.status(500).json({ message: "Error getting all users", error: err.message });
    }
}

// PUT /user/:id
async function updateUser(req, res) {
    // 1. Parse and Validate ID
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    // 2. Body validation
    const { name, dob, nationalID } = req.body;
    if (!name || !dob || !nationalID) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const updatedUser = await userModel.updateUsers(id, { name, dob, nationalID });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User updated", user: updatedUser });
    } catch (err) {
        // 3. Server-side logging
        console.error("Error in updateUser controller:", err);
        res.status(500).json({ message: "Error updating user", error: err.message });
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


module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    updateUser,
    findUserByEmail, 
};