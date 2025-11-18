const sql = require('mssql');
// 1. Corrected path to the dbConfig file in the root
const dbConfig = require('../dbConfig');

/**
 * Creates a new card for a user and links it to an account.
 * (UPDATED: Manages its own connection)
 */
async function createCard(cardData) {
    const { cardNo, userId, accountNo, expiryDate, pin } = cardData;
    let connection; // Changed from 'pool'
    try {
        connection = await sql.connect(dbConfig); // Open connection
        
        const sqlStatement = `
            INSERT INTO Card (CardNo, UserID, AccountNo, status, expiryDate, PIN, createdTime)
            OUTPUT INSERTED.*
            VALUES (@cardNo, @userId, @accountNo, 'active', @expiryDate, @pin, GETDATE())`;

        const request = connection.request(); // Create request from connection
        request.input('cardNo', sql.Int, cardNo);
        request.input('userId', sql.Int, userId);
        request.input('accountNo', sql.Int, accountNo);
        request.input('expiryDate', sql.Date, expiryDate);
        request.input('pin', sql.Char(64), pin); 

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Return the new card

    } catch (err) {
        console.error("Error in cardModel.createCard:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Gets a card by its Card Number.
 * (UPDATED: Manages its own connection)
 */
async function getByCardNo(cardNo) {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `SELECT * FROM Card WHERE CardNo = @cardNo`;

        const request = connection.request(); // Create request from connection
        request.input('cardNo', sql.Int, cardNo);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Returns card or undefined

    } catch (err) {
        console.error("Error in cardModel.getByCardNo:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Gets all cards belonging to a UserID.
 * (UPDATED: Manages its own connection)
 */
async function getByUserId(userId) {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `SELECT * FROM Card WHERE UserID = @userId`;

        const request = connection.request(); // Create request from connection
        request.input('userId', sql.Int, userId);

        const result = await request.query(sqlStatement);
        return result.recordset; // Returns an array of cards

    } catch (err) {
        console.error("Error in cardModel.getByUserId:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Updates a card's status (e.g., 'active', 'blocked').
 * (UPDATED: Manages its own connection)
 */
async function updateCardStatus(cardNo, newStatus) {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `
            UPDATE Card 
            SET status = @newStatus 
            OUTPUT INSERTED.CardNo, INSERTED.status
            WHERE CardNo = @cardNo`;

        const request = connection.request(); // Create request from connection
        request.input('cardNo', sql.Int, cardNo);
        request.input('newStatus', sql.VarChar(50), newStatus);

        const result = await request.query(sqlStatement);
        return result.recordset[0];

    } catch (err) {
        console.error("Error in cardModel.updateCardStatus:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Deletes a card from the database.
 * (UPDATED: Manages its own connection)
 */
async function deleteByCardNo(cardNo) {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `DELETE FROM Card WHERE CardNo = @cardNo`;

        const request = connection.request(); // Create request from connection
        request.input('cardNo', sql.Int, cardNo);

        await request.query(sqlStatement);
        return true; // Success

    } catch (err) {
        console.error("Error in cardModel.deleteByCardNo:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Finds the newest, active card for a user.
 * (UPDATED: Manages its own connection)
 */
async function findCardByUserId(userId) {
    let pool;
        try {
            pool = await sql.connect(dbConfig);
            const request = pool.request();
            request.input('userId', sql.Int, userId);
            request.input('accountNo', sql.Int, accountNo);
            const result = await request.query(`
                SELECT * FROM Card 
                WHERE UserID = @userId AND AccountNo = @accountNo AND status = 'active'
                ORDER BY createdTime DESC
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
    createCard,
    getByCardNo,
    getByUserId,
    updateCardStatus,
    deleteByCardNo,
    findCardByUserId
};