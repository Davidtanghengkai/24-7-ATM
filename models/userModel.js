// models/userModel.js
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');


async function createUser(userData) {
    const { name, dob, nationalID, bioType, BioData } = userData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);

        const bioReq = pool.request();
        bioReq.input("type", sql.VarChar, bioType);
        bioReq.input("bioData", sql.VarChar, BioData);
        //Insert bioData first to return biometricID
        const bioResult = await bioReq.query(`
            INSERT INTO Biometrics (type, bioData)
            OUTPUT INSERTED.ID
            VALUES (@type, @bioData)
        `);

        const biometricID = bioResult.recordset[0].ID;
        //insert User data now
        const sqlStatement = `
            INSERT INTO [User] (name, DOB, nationalID, biometricID)
            OUTPUT INSERTED.id
            VALUES (@name, @dob, @nationalID, @biometricID)`;

        const request = pool.request();
        request.input('name', sql.VarChar, name);
        request.input('dob', sql.Date, dob);
        request.input('nationalID', sql.VarChar, nationalID);
        request.input('biometricID', sql.Int, biometricID);

        const result = await request.query(sqlStatement);
        return result.recordset[0].id; // Return the user ID

    } catch (err) {
        console.error("Error in userModel.create:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

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

async function createCard(data) {
    const { cardNo, userID, accountNo, status, expiryDate, pin, createdTime } = data;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO Card (CardNo, UserID, AccountNo, status, expiryDate, PIN, createdTime)
            VALUES (@cardNo, @userID, @accountNo, @status, @expiryDate, @pin, @createdTime)`;
        
        const request = pool.request()
        request.input("cardNo", sql.Int, cardNo);
        request.input("userID", sql.Int, userID);
        request.input("accountNo", sql.Int, accountNo);
        request.input("status", sql.VarChar, status);
        request.input("expiryDate", sql.Date, expiryDate);
        request.input("pin", sql.VarChar, pin);
        request.input("createdTime", sql.DateTime, createdTime);
        await request.query(sqlStatement);

    } catch (err) {
        console.error("Error in userModel.createCard:", err);
        throw err;
    }finally {
        if (pool) pool.close();
    }
}

/**
 * Gets a single user by their ID.
 */
async function getUserById(userId) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `SELECT * FROM [User] WHERE id = @userId`;

        const request = new sql.Request(pool);
        request.input('userId', sql.Int, userId);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; 

    } catch (err) {
        console.error("Error in userModel.getById:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

/**
 * Gets all users from the database. (if needed?)
 */
async function getAllUsers() {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `SELECT * FROM [User]`;
        
        const result = await pool.request().query(sqlStatement);
        return result.recordset; // Returns an array of users

    } catch (err) {
        console.error("Error in userModel.getAll:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

async function getAllBiometrics() {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`SELECT * FROM Biometrics`);
        return result.recordset;
    } catch (err) {
        console.error("Error in userModel.getAllBiometrics:", err);
        throw err;
    }
    finally {
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

async function getCardsByUserIdandAccountId(userId, accountNo) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('accountNo', sql.Int, accountNo);
        const result = await request.query(`
            SELECT * FROM Card 
            WHERE UserID = @userId AND AccountNo = @accountNo
        `);
        return result.recordset;
    } 
    catch (err) {
        console.error("Error in userModel.getCardsByUserIdandAccountId:", err);
        throw err;
    }
    finally {
        if (pool) pool.close();
    }
}



module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    createAccount,
    createCard,
    getAllBiometrics,
    getAccountsByUserId,
    getCardsByUserIdandAccountId

};