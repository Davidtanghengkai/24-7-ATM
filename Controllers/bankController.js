const { 
  getCountries, 
  getBanksByCountry
} = require("../Models/bankModel");

async function fetchCountries(req, res) {
  try {
    const countries = await getCountries();

    if (!countries.length) {
      return res.status(404).json({ message: "No countries found" });
    }

    res.json(countries);

  } catch (err) {
    console.error("Controller Error (fetchCountries):", err.message);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
}

async function fetchBanks(req, res) {
  try {
    const { country } = req.params;

    const banks = await getBanksByCountry(country);

    if (!banks.length) {
      return res.status(404).json({ message: "No banks found for this country" });
    }

    res.json(banks);

  } catch (err) {
    console.error("Controller Error (fetchBanks):", err.message);
    res.status(500).json({ error: "Failed to fetch banks" });
  }
}

module.exports = { fetchCountries,fetchBanks };
