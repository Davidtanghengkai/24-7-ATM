const sql = require("mssql");
const crypto = require("crypto");
const config = require("../config/dbConfig");

// Generate SHA-256 hash
function generateIdentityHash(accountNo, bankName, country) {
    const raw = `${accountNo}-${bankName}-${country}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
}

async function createBlockchainUser(accountNo, bankName, country, verifiedByBankID) {
    let conn;

    try {
        // Open connection
        conn = await sql.connect(config);

        const identityHash = generateIdentityHash(accountNo, bankName, country);

        await conn.request()
            .input("accountNo", sql.VarChar(30), accountNo)
            .input("bankName", sql.VarChar(100), bankName)
            .input("country", sql.VarChar(50), country)
            .input("identityHash", sql.VarChar(64), identityHash)
            .input("verifiedByBankID", sql.Int, verifiedByBankID)
            .query(`
                INSERT INTO BlockchainUser (accountNo, bankName, country, identityHash, verifiedByBankID)
                VALUES (@accountNo, @bankName, @country, @identityHash, @verifiedByBankID)
            `);

        return identityHash;

    } catch (err) {
        console.error("BlockchainUser Insert Error:", err);
        throw err;
    } finally {
        if (conn) await conn.close();   // ALWAYS CLOSE CONNECTION
    }
}

// Verify if receiver exists in blockchain user table
async function verifyBlockchainUser(accountNo, bankName, country) {
  let connection;
  try {
    const identityHash = generateIdentityHash(accountNo, bankName, country);

    connection = await sql.connect(config);
    const result = await connection.request()
      .input("identityHash", sql.VarChar(64), identityHash)
      .query(`
        SELECT * FROM BlockchainUser 
        WHERE identityHash = @identityHash
      `);

    return {
      exists: result.recordset.length > 0,
      identityHash
    };

  } catch (err) {
    console.error("DB Error (verifyBlockchainUser):", err.message);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
    createBlockchainUser, 
    verifyBlockchainUser
};
