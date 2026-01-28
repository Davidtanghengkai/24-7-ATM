// services/fraudService.js
const sql = require("mssql");

/**
 * Extract features needed for rules.
 * Uses the SAME sql.Transaction (tx) so reads are consistent.
 */
async function computeFraudFeatures(tx, { senderAccountNo, receiverAccountNo, amountNum }) {
  // Feature A: prior transfers to this receiver (to decide if new/old receiver)
  const qPrior = await new sql.Request(tx)
    .input("sender", sql.Int, senderAccountNo)
    .input("receiver", sql.VarChar(30), String(receiverAccountNo))
    .query(`
      SELECT COUNT(*) AS cnt
      FROM Transactions
      WHERE senderAccountNo=@sender
        AND receiverAccountNo=@receiver
    `);

  const priorTransfersToReceiver = Number(qPrior.recordset[0].cnt || 0);

  // Feature B: sender current balance (before deduction)
  // NOTE: no UPDLOCK here because you already lock balance earlier in transactionModel.
  const qBal = await new sql.Request(tx)
    .input("sender", sql.Int, senderAccountNo)
    .query(`
      SELECT Balance
      FROM Accounts
      WHERE AccountNo=@sender
    `);

  const senderBalance = qBal.recordset.length > 0 ? Number(qBal.recordset[0].Balance) : 0;

  // Feature C: transfer count in last 5 minutes
  const q5m = await new sql.Request(tx)
    .input("sender", sql.Int, senderAccountNo)
    .query(`
      SELECT COUNT(*) AS cnt
      FROM Transactions
      WHERE senderAccountNo=@sender
        AND [timestamp] >= DATEADD(minute, -5, GETDATE())
    `);

  const txnCount5m = Number(q5m.recordset[0].cnt || 0);

  // Feature D: current hour for unusual time rule
  const nowHour = new Date().getHours();

  return {
    senderAccountNo,
    receiverAccountNo: String(receiverAccountNo),
    amount: Number(amountNum),
    priorTransfersToReceiver,
    senderBalance,
    txnCount5m,
    nowHour,
  };
}

/**
 * RULES:
 * R1: receiver is new
 * R2: receiver old but amount > half balance
 * R3: unusual time (00:00–05:00)
 * R4: >=3 transfers in last 5 minutes
 */
function decideFraud(f) {
  const hits = [];

  // Rule 1: New receiver
  const isNewReceiver = f.priorTransfersToReceiver === 0;
  if (isNewReceiver) {
    hits.push("R1_NEW_RECEIVER");
  }

  // Rule 2: Old receiver + amount > half of sender balance
  const isOldReceiver = f.priorTransfersToReceiver > 0;
  if (isOldReceiver && f.senderBalance > 0 && f.amount > (f.senderBalance / 2)) {
    hits.push("R2_AMOUNT_GT_HALF_BALANCE");
  }

  // Rule 3: Unusual time (midnight–5am)
  if (f.nowHour >= 0 && f.nowHour < 5) {
    hits.push("R3_UNUSUAL_TIME");
  }

  // Rule 4: Too many transfers in 5 min (>=3)
  if (f.txnCount5m >= 3) {
    hits.push("R4_HIGH_VELOCITY_5M");
  }

  return {
    decision: hits.length > 0 ? "VERIFY" : "ALLOW",
    hits,
  };
}

module.exports = { computeFraudFeatures, decideFraud };
