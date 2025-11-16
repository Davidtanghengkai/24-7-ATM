const sql = require("mssql");
const dbConfig = require("../config/dbConfig");

async function createBlock(previousHash, currentHash, transactionData, validatedBy) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection.request()
      .input("previousHash", sql.VarChar(64), previousHash)
      .input("currentHash", sql.VarChar(64), currentHash)
      .input("transactionData", sql.VarChar(sql.MAX), transactionData)
      .input("validatedBy", sql.VarChar(50), validatedBy)
      .query(`
        INSERT INTO BlockchainLedger (previousHash, currentHash, transactionData, validatedBy)
        OUTPUT INSERTED.blockID
        VALUES (@previousHash, @currentHash, @transactionData, @validatedBy)
      `);

    console.log("Block created successfully");
    return result.recordset[0].blockID;
  } catch (err) {
    console.error("DB Error (createBlock):", err.message);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createBlock };
