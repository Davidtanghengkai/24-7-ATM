const sql = require('mssql');
// 1. Corrected path
const dbConfig = require('../dbConfig'); 

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
        console.error("Error in userModel.createAccount:", err);
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
        console.error("Error in userModel.getAccountsByUserId:", err);
        throw err;
    }
    finally {
        if (pool) pool.close();
    }
}
module.exports = {
    createAccount,
    getAccountsByUserId
};