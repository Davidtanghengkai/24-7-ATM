const { verifyBlockchainUser } = require("../Models/blockchainUser");
const { createTransaction: createOverseasTxnSQLChain } = require("../Models/transactionModel");
const { getExchangeRate } = require("../Models/exchangeRate");
const { getBalance } = require("../Models/accountModel");
async function createOverseasTransaction(req, res) {
  try {
    const {
      senderAccountNo,
      receiverAccountNo,
      receiverBankID,      // your frontend naming
      receiverBankName,
      receiverCountry,
      amount,
      fromCurrency,
      toCurrency
    } = req.body;

    // 1) Validate (same scenario)
    if (
      senderAccountNo == null ||
      receiverAccountNo == null ||
      receiverBankID == null ||
      !receiverBankName ||
      !receiverCountry ||
      amount == null ||
      !fromCurrency ||
      !toCurrency
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const amtNum = Number(amount);
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // 2) Verify blockchain user (same scenario)
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

    // 3) Check sender balance (same scenario)
    const balance = await getBalance(senderAccountNo);
    if (balance === null) {
      return res.status(404).json({ message: "Sender account not found" });
    }
    if (amtNum > Number(balance)) {
      return res.status(400).json({
        message: "Insufficient balance to complete this transaction"
      });
    }

    // 4) Fetch exchange rate (same scenario)
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    const rateNum = Number(rate);
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      return res.status(500).json({ message: "Exchange rate unavailable" });
    }

    const totalConverted = (amtNum * rateNum).toFixed(2);

    // 5) Create transaction (SQL + Smart Contract together)
    //    NOTE: your SQL schema expects:
    //    bankID, currency, exchangeRate
    const result = await createOverseasTxnSQLChain({
      senderAccountNo: Number(senderAccountNo),
      receiverAccountNo: String(receiverAccountNo),
      bankID: Number(receiverBankID),
      amount: amtNum,
      currency: String(toCurrency),
      exchangeRate: rateNum,
      txnType: "Overseas"
    });

    // 6) Response (keep same scenario fields + add chain proof)
    return res.status(201).json({
      message: "Transaction completed successfully",
      blockchainVerified: true,

      rate: rateNum,
      senderAccountNo,
      receiverAccountNo,
      convertedAmount: `${totalConverted} ${toCurrency}`,

      // NEW: on-chain proof fields
      txnID: result.txnID,
      reference: result.reference,
      chainStatus: result.chainStatus,

      // keep compatibility for your old UI labels (optional)
      blockID: result.blockNumber || null,
      blockHash: result.txHash || null
    });
  } catch (err) {
    console.error("❌ Controller Error:", err);
    return res.status(500).json({
      error: "Failed to process transaction",
      detail: err.message
    });
  }
}

module.exports = { createOverseasTransaction };
