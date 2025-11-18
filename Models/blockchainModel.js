const sql = require("mssql");
const dbConfig = require("../dbConfig");
const crypto = require("crypto");


// ---------------------------------------------
// GET LAST BLOCK HASH
// ---------------------------------------------
async function getLastBlockHash() {
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    const result = await connection.request()
      .query(`
        SELECT TOP 1 currentHash
        FROM BlockchainLedger
        ORDER BY blockID DESC
      `);

    if (result.recordset.length === 0) {
      return "GENESIS";  // first block in blockchain
    }

    return result.recordset[0].currentHash;

  } catch (err) {
    console.error("DB Error (getLastBlockHash):", err.message);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

// ---------------------------------------------
// CREATE NEW BLOCK
// ---------------------------------------------
async function createBlock(previousHash, transactionData, validatedBy) {
  let connection;
  try {

    // Hash the transaction data
    const currentHash = crypto
      .createHash("sha256")
      .update(transactionData)
      .digest("hex");

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

    return {
      blockID: result.recordset[0].blockID,
      currentHash
    };

  } catch (err) {
    console.error("DB Error (createBlock):", err.message);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  createBlock,
  getLastBlockHash
};
