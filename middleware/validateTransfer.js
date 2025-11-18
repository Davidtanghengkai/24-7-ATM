function validateTransfer(req, res, next) {
  const {
    senderAccountNo,
    receiverAccountNo,
    receiverBankID,
    receiverBankName,
    receiverCountry,
    amount,
    fromCurrency,
    toCurrency
  } = req.body;

  if (
    !senderAccountNo ||
    !receiverAccountNo ||
    !receiverBankID ||
    !receiverBankName ||
    !receiverCountry ||
    !amount ||
    !fromCurrency ||
    !toCurrency) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
    return res.status(400).json({ message: "Amount cannot exceed 2 decimal places" });
  }

  next();
}

module.exports = validateTransfer;
