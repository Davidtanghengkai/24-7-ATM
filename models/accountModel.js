const sql = require("mssql");
const dbConfig = require("../config/dbConfig");

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

module.exports = { getBalance, updateBalance };