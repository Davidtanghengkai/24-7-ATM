// controllers/cardController.js
const cardModel = require('../models/cardModel');

async function createCard(req, res) {
    const { cardNo, userId, accountNo, expiryDate, pin } = req.body;
    if (!cardNo || !userId || !accountNo || !expiryDate || !pin) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const newCard = await cardModel.create({ cardNo, userId, accountNo, expiryDate, pin });
        res.status(201).json({ message: "Card created", card: newCard });
    } catch (err) {
        res.status(500).json({ message: "Error creating card", error: err.message });
    }
}

async function getCardByNo(req, res) {
    const { cardNo } = req.params;
    try {
        const card = await cardModel.getByCardNo(parseInt(cardNo, 10));
        if (!card) {
            return res.status(404).json({ message: "Card not found" });
        }
        res.status(200).json(card);
    } catch (err) {
        res.status(500).json({ message: "Error getting card", error: err.message });
    }
}

async function getCardsForUser(req, res) {
    const { userId } = req.params;
    try {
        const cards = await cardModel.getByUserId(parseInt(userId, 10));
        res.status(200).json(cards);
    } catch (err) {
        res.status(500).json({ message: "Error getting user's cards", error: err.message });
    }
}

async function changePin(req, res) {
    const { cardNo } = req.params;
    const { newPin } = req.body;
    if (!newPin || newPin.length !== 4) {
        return res.status(400).json({ message: "A valid 4-digit newPin is required" });
    }

    try {
        const updatedCard = await cardModel.updatePin(parseInt(cardNo, 10), newPin);
        if (!updatedCard) {
            return res.status(404).json({ message: "Card not found" });
        }
        res.status(200).json({ message: "PIN updated", data: updatedCard });
    } catch (err) {
        res.status(500).json({ message: "Error updating PIN", error: err.message });
    }
}

async function changeStatus(req, res) {
    const { cardNo } = req.params;
    const { newStatus } = req.body;
    if (!newStatus) {
        return res.status(400).json({ message: "A newStatus is required" });
    }

    try {
        const updatedCard = await cardModel.updateStatus(parseInt(cardNo, 10), newStatus);
        if (!updatedCard) {
            return res.status(404).json({ message: "Card not found" });
        }
        res.status(200).json({ message: "Status updated", data: updatedCard });
    } catch (err) {
        res.status(500).json({ message: "Error updating status", error: err.message });
    }
}

async function deleteCard(req, res) {
    const { cardNo } = req.params;
    try {
        await cardModel.deleteByCardNo(parseInt(cardNo, 10));
        res.status(200).json({ message: "Card deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting card", error: err.message });
    }
}

module.exports = {
    createCard,
    getCardByNo,
    getCardsForUser,
    changePin,
    changeStatus,
    deleteCard
};