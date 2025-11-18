const sql = require("mssql");
const dbConfig = require("../config/dbConfig");

/**
 * Creates a new overseas transaction
 */
async function createTransaction(data) {
  const {
    senderAccountNo,
    receiverAccountNo,
    bankID,
    amount,
    currency,
    exchangeRate,
    txnType,
    blockID
  } = data;

  const totalConverted = amount * exchangeRate;

  let connection;
  try {
    connection = await sql.connect(dbConfig);

    await connection.request()
      .input("senderAccountNo", sql.Int, senderAccountNo)
      .input("receiverAccountNo", sql.VarChar(20), receiverAccountNo)
      .input("bankID", sql.Int, bankID)
      .input("amount", sql.Decimal(18, 2), amount)
      .input("currency", sql.VarChar(10), currency)
      .input("exchangeRate", sql.Decimal(10, 4), exchangeRate)
      .input("totalConverted", sql.Decimal(18, 2), totalConverted)
      .input("txnType", sql.VarChar(20), txnType || "Overseas")
      .input("blockID", sql.Int, blockID)
      .query(`
        INSERT INTO Transactions 
        (senderAccountNo, receiverAccountNo, bankID, amount, currency, exchangeRate, totalConverted, txnType, blockID)
        VALUES 
        (@senderAccountNo, @receiverAccountNo, @bankID, @amount, @currency, @exchangeRate, @totalConverted, @txnType, @blockID)
      `); 
  } catch (err) {
    console.error("DB Error (createTransaction):", err.message);
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = { createTransaction};
