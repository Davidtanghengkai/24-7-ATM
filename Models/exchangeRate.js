const axios = require("axios");
require("dotenv").config(); // make sure this line is here!

async function getExchangeRate(base, target) {
  try {
    const options = {
      method: "GET",
      url: "https://exchange-rates7.p.rapidapi.com/convert",
      params: { base, target },
      headers: {
        "x-rapidapi-key": process.env.API_KEY,  // ✅ correct name
        "x-rapidapi-host": "exchange-rates7.p.rapidapi.com"
      }
    };

    const { data } = await axios.request(options);
    console.log("🔍 RAW RapidAPI response:", data);

    // ⭐ Correct extraction based on your API response
    const rate = data?.convert_result?.rate;

    if (!rate || isNaN(rate)) {
      throw new Error("Invalid rate returned from RapidAPI");
    }
    
    return rate;
  } catch (err) {
    console.error("RapidAPI Error:", err.message);
    throw err;
  }
}

module.exports = { getExchangeRate };
