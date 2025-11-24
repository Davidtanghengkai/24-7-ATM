const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function createAccount(accountData) {
    const { userId, accountType, balance } = accountData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO Accounts (userID, Balance, Type)
            OUTPUT INSERTED.AccountNo
            VALUES (@userId, @balance, @accountType)
        `;

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('balance', sql.Decimal(18, 2), balance);
        request.input('accountType', sql.VarChar, accountType);

        const result = await request.query(sqlStatement);
        return result.recordset[0].AccountNo; // note the exact casing

    } catch (err) {
        console.error("Error in accountModel.createAccount:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

async function getAccountsByUserId(userId) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('userId', sql.Int, userId);
        const result = await request.query(`SELECT * FROM Accounts WHERE userId = @userId`);
        return result.recordset;
    }
    catch (err) {
        console.error("Error in accountModel.getAccountsByUserId:", err);
        throw err;
    }
    finally {
        if (pool) pool.close();
    }
}

async function getBalance(accountNo) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);
        const result = await connection.request()
            .input("accountNo", sql.Int, accountNo)
            .query(`SELECT balance FROM Accounts WHERE accountNo = @accountNo`);
                
        if (!result.recordset.length) {
        return null;
        }
        
        return result.recordset[0].balance;
    }catch (err) {
        console.error("DB Error (getBalance):", err.message);
        throw err;
    }finally {   
        if (connection) await connection.close();
    }
}

async function updateBalance(accountNo, amount) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);   
        const result = await connection.request()
            .input("accountNo", sql.Int, accountNo)
            .input("amount", sql.Decimal(18, 2), amount)
            .query(`
                UPDATE Accounts 
                SET balance = balance - @amount
                WHERE accountNo = @accountNo
            `);

        return result.rowsAffected[0] === 1;
    } catch (err) {
        console.error("DB Error (updateBalance):", err.message);
        throw err;
    } finally {
        if (connection) await connection.close();
    }   
}

async function increaseBalance(accountNo, amount) {
  try {
    const conn = await sql.connect(dbConfig);

    const result = await conn
      .request()
      .input("accountNo", sql.Int, accountNo)
      .input("amount", sql.Decimal(18, 2), amount)
      .query(
        `UPDATE Accounts
         SET Balance = Balance + @amount
         WHERE accountNo = @accountNo`
      );

    conn.close();

    return result.rowsAffected[0] > 0;

  } catch (err) {
    console.error("Model Error (increaseBalance):", err);
    throw err;
  }
}

module.exports = { getBalance, updateBalance, createAccount, getAccountsByUserId, increaseBalance};
