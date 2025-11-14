const sql = require('mssql');
const dbConfig = require('../config/dbConfig');


// Creates a new card for a user and links it to an account.

async function createCard(cardData) {
    const { cardNo, userId, accountNo, expiryDate, pin } = cardData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO Card (CardNo, UserID, AccountNo, status, expiryDate, PIN, createdTime)
            OUTPUT INSERTED.*
            VALUES (@cardNo, @userId, @accountNo, 'active', @expiryDate, @pin, GETDATE())`;

        const request = new sql.Request(pool);
        request.input('cardNo', sql.Int, cardNo);
        request.input('userId', sql.Int, userId);
        request.input('accountNo', sql.Int, accountNo);
        request.input('expiryDate', sql.Date, expiryDate);
        request.input('pin', sql.VarChar(4), pin);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Return the new card

    } catch (err) {
        console.error("Error in cardModel.create:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

async function getByCardNo(cardNo) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `SELECT * FROM Card WHERE CardNo = @cardNo`;

        const request = new sql.Request(pool);
        request.input('cardNo', sql.Int, cardNo);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Returns card or undefined

    } catch (err) {
        console.error("Error in cardModel.getByCardNo:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}


async function getByUserId(userId) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `SELECT * FROM Card WHERE UserID = @userId`;

        const request = new sql.Request(pool);
        request.input('userId', sql.Int, userId);

        const result = await request.query(sqlStatement);
        return result.recordset; // Returns an array of cards

    } catch (err) {
        console.error("Error in cardModel.getByUserId:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}




async function updateCardStatus(cardNo, newStatus) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            UPDATE Card 
            SET status = @newStatus 
            OUTPUT INSERTED.CardNo, INSERTED.status
            WHERE CardNo = @cardNo`;

        const request = new sql.Request(pool);
        request.input('cardNo', sql.Int, cardNo);
        request.input('newStatus', sql.VarChar(50), newStatus);

        const result = await request.query(sqlStatement);
        return result.recordset[0];

    } catch (err) {
        console.error("Error in cardModel.updateStatus:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

/**
 * Deletes a card from the database.
 */
async function deleteByCardNo(cardNo) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `DELETE FROM Card WHERE CardNo = @cardNo`;

        const request = new sql.Request(pool);
        request.input('cardNo', sql.Int, cardNo);

        await request.query(sqlStatement);
        return true; // Success

    } catch (err) {
        console.error("Error in cardModel.deleteByCardNo:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}


module.exports = {
    createCard,
    getByCardNo,
    getByUserId,
    updateCardStatus,
    deleteByCardNo
};