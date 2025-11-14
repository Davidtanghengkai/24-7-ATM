// controllers/userController.js
const userModel = require('../models/userModel');

// POST /user/create
async function createUser(req, res) {
    const { name, dob, nationalID } = req.body;
    if (!name || !dob || !nationalID) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const newUserID = await userModel.create({ name, dob, nationalID });
        res.status(201).json({ message: "User created", userID: newUserID });
    } catch (err) {
        res.status(500).json({ message: "Error creating user", error: err.message });
    }
}

// GET /user/:id
async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const user = await userModel.getById(parseInt(id, 10));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);

    } catch (err) {
        res.status(500).json({ message: "Error getting user", error: err.message });
    }
}

// GET /user/
async function getAllUsers(req, res) {
    try {
        const users = await userModel.getAll();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: "Error getting all users", error: err.message });
    }
}

// PUT /user/:id
async function updateUser(req, res) {
    const { id } = req.params;
    const { name, dob, nationalID } = req.body;

    if (!name || !dob || !nationalID) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const updatedUser = await userModel.update(parseInt(id, 10), { name, dob, nationalID });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User updated", user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: "Error updating user", error: err.message });
    }
}

// PUT /user/:id/link-biometric
async function linkUserBiometric(req, res) {
    const { id } = req.params;
    const { biometricId } = req.body;

    if (!biometricId) {
        return res.status(400).json({ message: "Missing biometricId" });
    }

    try {
        const updatedLink = await userModel.linkBiometric(parseInt(id, 10), biometricId);
        if (!updatedLink) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Biometric linked", data: updatedLink });
    } catch (err) {
        res.status(500).json({ message: "Error linking biometric", error: err.message });
    }
}



module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    updateUser,
    linkUserBiometric,

};