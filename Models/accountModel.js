const sql = require("mssql");
const dbConfig = require("../dbConfig");


async function createAccount(accountData) {
    const { userId, Balance, Type, AccountName, Status } = accountData; // match JS payload
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO Accounts (userID, Balance, Type, AccountName, Status)
            OUTPUT INSERTED.AccountNo
            VALUES (@userId, @Balance, @Type, @AccountName, @Status)
        `;

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('Balance', sql.Decimal(18, 2), Balance);
        request.input('Type', sql.VarChar(50), Type);
        request.input('AccountName', sql.VarChar(100), AccountName);
        request.input('Status', sql.VarChar(20), Status);

        const result = await request.query(sqlStatement);
        return result.recordset[0].AccountNo;

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
        const result = await request.query(`          
            SELECT * FROM Accounts WHERE userID = @userId ORDER BY 
            (CASE WHEN UPPER(TRIM(Status)) = 'ACTIVE' THEN 0 ELSE 1 END) ASC, 
            [AccountNo] ASC;
        `);

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

async function freezeAccount(accountNo) {
  let pool;
    try {
        pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('accountNo', sql.Int, accountNo);
        const result = await request.query(`UPDATE Accounts SET Status = 'Frozen' WHERE accountNo = @accountNo`);
        return result.rowsAffected[0] === 1;
    }
    catch (err) {
        console.error("Error in accountModel.freezeAccount:", err);
        throw err;
    }
    finally {
        if (pool) pool.close();
    }
}


async function freezeAllAccounts(userId) {
  let pool;
    try {
        pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('userId', sql.Int, userId);
        const result = await request.query(`UPDATE Accounts SET Status = 'Frozen' WHERE userID = @userId`);
        return result.rowsAffected[0];
    }
    catch (err) {
        console.error("Error in accountModel.freezeAllAccounts:", err);
        throw err;
    }
    finally {
        if (pool) pool.close();
    }
}



module.exports = { getBalance, updateBalance, createAccount, getAccountsByUserId, increaseBalance, freezeAccount, freezeAllAccounts };
