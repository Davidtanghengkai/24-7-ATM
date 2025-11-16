const { verifyBlockchainUser } = require("../Models/blockchainUser");
const { createTransaction } = require("../Models/transactionModel");
const { getExchangeRate } = require("../Models/exchangeRate");
const { getBalance, updateBalance } = require("../Models/accountModel");

async function createOverseasTransaction(req, res) {
  try {
    const {
      senderAccountNo,
      receiverAccountNo,
      receiverBankID,
      receiverBankName,
      receiverCountry,
      amount,
      fromCurrency,
      toCurrency         // ✅ Currency now comes from frontend
    } = req.body;

    // 1. Validate
    if (
      !senderAccountNo ||
      !receiverAccountNo ||
      !receiverBankID ||
      !receiverBankName ||
      !receiverCountry ||
      !amount ||
      !fromCurrency ||
      !toCurrency        // 🔥 Ensure currency is included
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 2. Verify blockchain user
    const verify = await verifyBlockchainUser(
      receiverAccountNo,
      receiverBankName,
      receiverCountry
    );

    if (!verify.exists) {
      return res.status(403).json({
        verified: false,
        message: "Receiver is NOT blockchain verified"
      });
    }

    // 3. Check sender balance
    const balance = await getBalance(senderAccountNo);
    if (balance === null) {
      return res.status(404).json({ message: "Sender account not found" });
    }

    if (Number(amount) > Number(balance)) {
      return res.status(400).json({
        message: "Insufficient balance to complete this transaction"
      });
    }
    
    // 4. Fetch exchange rate
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    const totalConverted = (amount * rate).toFixed(2);

    // 5. Deduct balance
    await updateBalance(senderAccountNo, amount);

    // 6. Create transaction
    await createTransaction({
      senderAccountNo,
      receiverAccountNo,
      bankID: receiverBankID,
      amount,
      currency: toCurrency,
      exchangeRate: rate,
      txnType: "Overseas",
      blockID: null
    });

    // 7. Respond
    res.status(201).json({
      message: "Transaction completed successfully",
      blockchainVerified: true,
      rate,
      senderAccountNo,
      receiverAccountNo,
      convertedAmount: `${totalConverted} ${toCurrency}`
    });

  } catch (err) {
    console.error("❌ Controller Error:", err.message);
    res.status(500).json({ error: "Failed to process transaction" });
  }
}

module.exports = { createOverseasTransaction };
