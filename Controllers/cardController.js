const cardModel = require('../Models/cardModel');

// POST /card/
async function createCard(req, res) {
    const {userId, accountNo, expiryDate, pin, description } = req.body;
    if ( !userId || !accountNo || !expiryDate || !pin || !description) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        // FIXED: Called the correct model function
        const newCard = await cardModel.createCard({userId, accountNo, expiryDate, pin, description});
        res.status(201).json({ message: "Card created", card: newCard });
    } catch (err) {
        // ADDED: Server-side logging
        console.error("Error in createCard controller:", err);
        res.status(500).json({ message: "Error creating card", error: err.message });
    }
}


// GET /card/:cardNo
async function getCardByNo(req, res) {
    // ADDED: NaN validation
    const cardNo = parseInt(req.params.cardNo, 10);
    if (isNaN(cardNo)) {
        return res.status(400).json({ message: "Invalid card number" });
    }

    try {
        const card = await cardModel.getByCardNo(cardNo);
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }
        res.status(200).json(card);
    } catch (err) {
        // ADDED: Server-side logging
        console.error("Error in getCardByNo controller:", err);
        res.status(500).json({ message: "Error getting card", error: err.message });
    }
}

// GET /card/user/:userId
async function getCardsForUser(req, res) {
    // ADDED: NaN validation
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
    }

    try {
        const cards = await cardModel.getByUserId(userId);
        res.status(200).json(cards); // Returns cards, or empty array
    } catch (err) {
        // ADDED: Server-side logging
        console.error("Error in getCardsForUser controller:", err);
        res.status(500).json({ message: "Error getting user's cards", error: err.message });
    }
}

// PUT /card/status/:cardNo
async function changeStatus(req, res) {
    // ADDED: NaN validation
    const cardNo = parseInt(req.params.cardNo, 10);
    if (isNaN(cardNo)) {
        return res.status(400).json({ message: "Invalid card number" });
    }

    const { newStatus } = req.body;
    if (!newStatus) {
        return res.status(400).json({ message: "A newStatus is required" });
    }

    try {
        // FIXED: Called the correct model function
        const updatedCard = await cardModel.updateCardStatus(cardNo, newStatus);
        if (!updatedCard) {
            return res.status(404).json({ message: "Card not found" });
        }
        res.status(200).json({ message: "Status updated", data: updatedCard });
    } catch (err) {
        // ADDED: Server-side logging
        console.error("Error in changeStatus controller:", err);
        res.status(500).json({ message: "Error updating status", error: err.message });
    }
}

// DELETE /card/:cardNo
async function deleteCard(req, res) {
    // ADDED: NaN validation
    const cardNo = parseInt(req.params.cardNo, 10);
    if (isNaN(cardNo)) {
        return res.status(400).json({ message: "Invalid card number" });
    }

    try {
        // We should check if it exists first for a 404
        const card = await cardModel.getByCardNo(cardNo);
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }

        await cardModel.deleteByCardNo(cardNo);
        res.status(200).json({ message: "Card deleted successfully" });
    } catch (err) {
        // ADDED: Server-side logging
        console.error("Error in deleteCard controller:", err);
        res.status(500).json({ message: "Error deleting card", error: err.message });
    }
}

// --- MISSING CONTROLLERS ADDED ---

// GET /card/active/user/:userId
async function findCardsByUserId(req, res) {
    // ADDED: NaN validation
    const userId = parseInt(req.params.userId);
    const accountNo = parseInt(req.params.accountNo);

    if (isNaN(userId) || isNaN(accountNo)) {
        return res.status(400).json({ message: "Invalid user ID or account number" });
    }

    try {
        const card = await cardModel.findCardByUserId(userId, accountNo);
        if (!card) {
            return res.status(404).json({ message: "No active card found" });
        }
        res.status(200).json(card);
    } catch (err) {
        
        console.error("Error in findActiveCardByUserId controller:", err);
        res.status(500).json({ message: "Error finding active card", error: err.message });
    }
}


module.exports = {
    createCard,
    getCardByNo,
    getCardsForUser,
    changeStatus,
    deleteCard,
    findCardsByUserId
};