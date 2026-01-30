const sql = require("mssql");
const dbConfig = require("../dbConfig");
const { recordOverseasOnChain, toCents } = require("../services/blockchainService");
const { computeFraudFeatures, decideFraud } = require("../services/fraudService");

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
    txnType,
    forceProceed = false,
    isVerified= false,
    pendingTxnID = null,
    reference: incomingRef = null
  } = data;

  const amountNum = Number(amount);
  const rateNum = Number(exchangeRate);
  let reference = incomingRef || makeRef();


  if (!senderAccountNo || !receiverAccountNo || !bankID || !amountNum || amountNum <= 0 || !currency || !rateNum) {
    throw new Error("Invalid input");
  }

  const totalConverted = amountNum * rateNum;


  let txnID;
  let receiverBcUserID;
  let fraudResult= null;
  let usingExistingPending = false;
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
    
    // 2.5) FRAUD RULE CHECK (if any rule triggers → ask user to verify)
    {
      const features = await computeFraudFeatures(tx, {
        senderAccountNo,
        receiverAccountNo,
        amountNum
      });

      fraudResult = decideFraud(features);

      if (fraudResult.decision === "VERIFY" && !(isVerified && forceProceed)) {
        // Insert txn but don't deduct balance, don't do blockchain yet
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
             status, txnType, [timestamp],
             receiverBcUserID, receiverVerified, reference, chainStatus)
          OUTPUT INSERTED.txnID
          VALUES
            (@senderAccountNo, @receiverAccountNo, @bankID, @amount, @currency, @exchangeRate, @totalConverted,
             'PENDING_VERIFICATION', @txnType, GETDATE(),
             @receiverBcUserID, 1, @reference, 'VERIFY_REQUIRED')
        `);

        txnID = insert.recordset[0].txnID;

        await tx.commit(); // commit insert

        // ✅ return verification message immediately
        return {
          txnID,
          reference,
          chainStatus: "VERIFY_REQUIRED",
          status: "PENDING_VERIFICATION",
          message: "Please verify yourself to proceed with this transaction",
          triggeredRules: fraudResult.hits
        };
      }
    }

    if (isVerified && forceProceed && pendingTxnID) {
      usingExistingPending = true;

      // 1) load & validate pending txn
      const q = await new sql.Request(tx)
        .input("id", sql.Int, pendingTxnID)
        .query(`
          SELECT txnID, senderAccountNo, receiverAccountNo, bankID, amount, status, reference, receiverBcUserID
          FROM Transactions WITH (UPDLOCK, ROWLOCK)
          WHERE txnID=@id
        `);

      if (q.recordset.length === 0) throw new Error("Pending transaction not found");

      const row = q.recordset[0];

      if (row.status !== "PENDING_VERIFICATION") throw new Error("Transaction is not pending verification");
      if (Number(row.senderAccountNo) !== senderAccountNo) throw new Error("Sender mismatch");
      if (String(row.receiverAccountNo) !== String(receiverAccountNo)) throw new Error("Receiver mismatch");
      if (Number(row.bankID) !== bankID) throw new Error("Bank mismatch");
      if (Number(row.amount) !== amountNum) throw new Error("Amount mismatch");

      // IMPORTANT: use stored reference + bcUserID
      txnID = row.txnID;
      receiverBcUserID = Number(row.receiverBcUserID);
      reference = row.reference;
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
    if(usingExistingPending) {
      const req = new sql.Request(tx);
      req.input("id", sql.Int, txnID);
      req.input("exchangeRate", sql.Decimal(10, 4), rateNum);
      req.input("totalConverted", sql.Decimal(18, 2), totalConverted);
      req.input("reference", sql.VarChar(50), reference);

      await req.query(`
        UPDATE Transactions
        SET status='Confirmed',
            chainStatus='PENDING_CHAIN',
            exchangeRate=@exchangeRate,
            totalConverted=@totalConverted,
            reference=@reference,
            [timestamp]=GETDATE()
        WHERE txnID=@id
      `);
      } else{
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

async function createWithdrawal(data) {
  const { accountNo, amount } = data;
  let conn;
  try {
    conn = await sql.connect(dbConfig);
    const request = conn.request();
    const reference = makeRef("WDR");
    request.input("accountNo", sql.Int, accountNo);
    request.input("amount", sql.Decimal(18, 2), amount);
    request.input("reference", sql.VarChar(50), reference);
    
    // Using bankID = 1 as a default for ATM withdrawals
    // receiverAccountNo = 'ATM'
    const result = await request.query(`
      INSERT INTO Transactions 
        (senderAccountNo, receiverAccountNo, bankID, amount, currency, exchangeRate, totalConverted, status, txnType, timestamp, reference,chainStatus)
      VALUES 
        (@accountNo, 'ATM', 1, @amount, 'SGD', 1.0, @amount, 'Confirmed', 'Withdrawal', GETDATE(), @reference, 'SQL_ONLY')
    `);
    
    return { success: true,reference,rowsAffected:result.rowsAffected[0] };
  } catch (err) {
    console.error("Error in transactionModel.createWithdrawal:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

async function getTransactionsByAccount(accountNo) {
  let conn;
  try {
    conn = await sql.connect(dbConfig);
    const request = conn.request();
    request.input("accountNo", sql.Int, accountNo);
    
    // Fetch transactions where the account is either the sender or the receiver
    const result = await request.query(`
      SELECT * FROM Transactions 
      WHERE senderAccountNo = @accountNo OR receiverAccountNo = CAST(@accountNo AS VARCHAR(20))
      ORDER BY timestamp DESC
    `);
    
    return result.recordset;
  } catch (err) {
    console.error("Error in transactionModel.getTransactionsByAccount:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

async function createDeposit(data) {
  const { accountNo, amount } = data;
  let conn;
  try {
    conn = await sql.connect(dbConfig);
    const request = conn.request();
    const reference = makeRef("DEP");
    request.input("accountNo", sql.Int, accountNo);
    request.input("amount", sql.Decimal(18, 2), amount);
    request.input("reference", sql.VarChar(50), reference);
    
    // For deposits, sender is 'ATM' and receiver is the account
    const result = await request.query(`
      INSERT INTO Transactions 
        (senderAccountNo, receiverAccountNo, bankID, amount, currency, exchangeRate, totalConverted, status, txnType, timestamp, reference,chainStatus)
      VALUES 
        (1, CAST(@accountNo AS VARCHAR(20)), 1, @amount, 'SGD', 1.0, @amount, 'Confirmed', 'Deposit', GETDATE(), @reference, 'SQL_ONLY' )
    `);
    
    return { success: true,reference,rowsAffected:result.rowsAffected[0] };
  } catch (err) {
    console.error("Error in transactionModel.createDeposit:", err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

module.exports = { createTransaction, createWithdrawal, getTransactionsByAccount, createDeposit };
