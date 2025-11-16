const { getExchangeRate } = require("../models/exchangeRate");


async function fetchExchangeRate(req, res) {
  try {
    const { base, target } = req.query;

    // Validate required query params
    if (!base || !target) {
      return res.status(400).json({
        error: "Missing required query parameters: base, target"
      });
    }

    // Fetch exchange rate using model
    const rate = await getExchangeRate(base, target);

    if (!rate) {
      return res.status(404).json({ 
        error: "Exchange rate not available" 
      });
    }

    // Success response
    res.json({
      base,
      target,
      rate
    });
    
  } catch (err) {
    console.error("Controller Error (fetchExchangeRate):", err.message);
    res.status(500).json({
      error: "Failed to fetch exchange rate"
    });
  }
}

module.exports = { fetchExchangeRate };
