const { createBlockchainUser } = require("../Models/blockchainUser");

async function addBlockchainUser(req, res) {
    try {
        const { accountNo, bankName, country, verifiedByBankID } = req.body;

        // Validate required fields
        if (!accountNo || !bankName || !country) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Call model to create blockchain user
        const identityHash = await createBlockchainUser(
            accountNo,
            bankName,
            country,
            verifiedByBankID || null
        );

        // Success response
        return res.status(201).json({
            message: "Blockchain user added successfully",
            identityHash: identityHash
        });

    } catch (err) {
        console.error("Controller error (addBlockchainUser):", err);
        return res.status(500).json({ error: "Failed to add blockchain user" });
    }
};

module.exports = { addBlockchainUser };

