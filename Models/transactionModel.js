const sql = require("mssql");
const dbConfig = require("../dbConfig");
const { recordOverseasOnChain, toCents } = require("../services/blockchainService");

function makeRef() {
  return `OTR-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function createTransaction(data) {
  const {
    senderAccountNo,
    receiverAccountNo,
    bankID,
    amount,
    currency,
    exchangeRate,
    txnType
  } = data;

  const amountNum = Number(amount);
  const rateNum = Number(exchangeRate);

  if (!senderAccountNo || !receiverAccountNo || !bankID || !amountNum || amountNum <= 0 || !currency || !rateNum) {
    throw new Error("Invalid input");
  }

  const totalConverted = amountNum * rateNum;
  const reference = makeRef();

  let txnID;
  let receiverBcUserID;

  // ----------------- PHASE 1: SQL (ATOMIC) -----------------
  let conn;
  let tx;
  try {
    conn = await sql.connect(dbConfig);
    tx = new sql.Transaction(conn);
    await tx.begin();

    // 1) Lock + check sender balance
    {
      const req = new sql.Request(tx);
      req.input("sender", sql.Int, senderAccountNo);

      const sender = await req.query(`
        SELECT Balance
        FROM Accounts WITH (UPDLOCK, ROWLOCK)
        WHERE AccountNo=@sender
      `);

      if (sender.recordset.length === 0) throw new Error("Sender account not found");

      const bal = Number(sender.recordset[0].Balance);
      if (bal < amountNum) throw new Error("Insufficient funds");
    }

    // 2) Verify receiver exists as BlockchainUser for this bank
    {
      const req = new sql.Request(tx);
      req.input("receiverAcc", sql.VarChar(30), String(receiverAccountNo));
      req.input("bankID", sql.Int, bankID);

      const bc = await req.query(`
        SELECT bcUserID
        FROM BlockchainUser
        WHERE accountNo=@receiverAcc
          AND verifiedByBankID=@bankID
      `);

      if (bc.recordset.length === 0) {
        throw new Error("Receiver not verified (BlockchainUser not found for this bank)");
      }

      receiverBcUserID = Number(bc.recordset[0].bcUserID);
    }

    // 3) Deduct sender balance
    {
      const req = new sql.Request(tx);
      req.input("sender", sql.Int, senderAccountNo);
      req.input("amt", sql.Decimal(18, 2), amountNum);

      await req.query(`
        UPDATE Accounts
        SET Balance = Balance - @amt
        WHERE AccountNo=@sender
      `);
    }

    // 4) Insert transaction (PENDING_CHAIN)
    {
      const req = new sql.Request(tx);
      req.input("senderAccountNo", sql.Int, senderAccountNo);
      req.input("receiverAccountNo", sql.VarChar(30), String(receiverAccountNo));
      req.input("bankID", sql.Int, bankID);
      req.input("amount", sql.Decimal(18, 2), amountNum);
      req.input("currency", sql.VarChar(10), currency);
      req.input("exchangeRate", sql.Decimal(10, 4), rateNum);
      req.input("totalConverted", sql.Decimal(18, 2), totalConverted);
      req.input("txnType", sql.VarChar(20), txnType || "Overseas");
      req.input("reference", sql.VarChar(50), reference);
      req.input("receiverBcUserID", sql.Int, receiverBcUserID);

      const insert = await req.query(`
        INSERT INTO Transactions
          (senderAccountNo, receiverAccountNo, bankID, amount, currency, exchangeRate, totalConverted,
           status, txnType, timestamp,
           receiverBcUserID, receiverVerified, reference, chainStatus)
        OUTPUT INSERTED.txnID
        VALUES
          (@senderAccountNo, @receiverAccountNo, @bankID, @amount, @currency, @exchangeRate, @totalConverted,
           'Confirmed', @txnType, GETDATE(),
           @receiverBcUserID, 1, @reference, 'PENDING_CHAIN')
      `);

      txnID = insert.recordset[0].txnID;
    }

    await tx.commit();
  } catch (err) {
    if (tx) await tx.rollback().catch(() => {});
    throw err;
  } finally {
    if (conn) await conn.close().catch(() => {});
  }

  // ----------------- PHASE 2: BLOCKCHAIN -----------------
  try {
    const amountCents = toCents(amountNum);

    // recordOverseasOnChain should return { txHash, blockNumber }
    const { txHash, blockNumber } = await recordOverseasOnChain(
      receiverBcUserID,
      amountCents,
      reference
    );

    let conn2;
    try {
      conn2 = await sql.connect(dbConfig);
      await conn2.request()
        .input("id", sql.Int, txnID)
        .input("txHash", sql.VarChar(66), txHash)
        .input("blockNo", sql.Int, blockNumber)
        .query(`
          UPDATE Transactions
          SET chainStatus='ON_CHAIN',
              blockchainTxHash=@txHash,
              blockchainBlockNo=@blockNo
          WHERE txnID=@id
        `);
    } finally {
      if (conn2) await conn2.close().catch(() => {});
    }

    return { txnID, reference, receiverBcUserID, chainStatus: "ON_CHAIN", txHash, blockNumber };

  } catch (chainErr) {
    let conn3;
    try {
      conn3 = await sql.connect(dbConfig);
      await conn3.request()
        .input("id", sql.Int, txnID)
        .query(`
          UPDATE Transactions
          SET chainStatus='NEEDS_REVIEW'
          WHERE txnID=@id
        `);
    } finally {
      if (conn3) await conn3.close().catch(() => {});
    }

    return { txnID, reference, receiverBcUserID, chainStatus: "NEEDS_REVIEW", error: chainErr.message };
  }
}

module.exports = { createTransaction };
