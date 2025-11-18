const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function createAccount(accountData) {
    const { userId, accountType, balance } = accountData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO Accounts (userId, accountType, balance)
            OUTPUT INSERTED.accountNo
            VALUES (@userId, @accountType, @balance)`;

        //Creates account for user and return account number

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('accountType', sql.VarChar, accountType);
        request.input('balance', sql.Decimal(18, 2), balance);
        const result = await request.query(sqlStatement);
        return result.recordset[0].accountNo;

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

module.exports = { getBalance, updateBalance, createAccount, getAccountsByUserId };
