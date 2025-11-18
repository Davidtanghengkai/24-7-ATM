const TranslationModel = require("../models/translationModel");
const model = new TranslationModel();

async function getTranslations(req, res) {
    const { targetLang } = req.body; 
    
    //Input Validation
    if (!targetLang) {
        return res.status(400).json({ error: "Target language name is required in the request body (targetLang)." });
    }

    try {
        const translations = await model.getTranslations(targetLang);
        

        res.status(200).json(translations);
    } catch (error) {
        console.error("Error retrieving translations:", error);
        // Catch specific errors from the model (like Google credentials failure)
        res.status(500).json({ error: error.message || "Failed to get translations due to a server error." });
    }
}

module.exports = { 
    getTranslations
};