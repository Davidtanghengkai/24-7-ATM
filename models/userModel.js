// models/userModel.js
const sql = require('mssql');
const dbConfig = require('../config/dbConfig');


async function createUser(userData) {
    const { name, dob, nationalID } = userData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            INSERT INTO [User] (name, DOB, nationalID)
            OUTPUT INSERTED.id
            VALUES (@name, @dob, @nationalID)`;

        const request = new sql.Request(pool);
        request.input('name', sql.VarChar, name);
        request.input('dob', sql.Date, dob);
        request.input('nationalID', sql.VarChar, nationalID);

        const result = await request.query(sqlStatement);
        return result.recordset[0].id; // Return the new ID

    } catch (err) {
        console.error("Error in userModel.create:", err);
        throw err;
    } finally {
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
        return result.recordset[0]; // Returns the user object or undefined

    } catch (err) {
        console.error("Error in userModel.getById:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}

/**
 * Gets all users from the database.
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

/**
 * Updates an existing user's details.
 */
async function updateUsers(userId, userData) {
    const { name, dob, nationalID } = userData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const sqlStatement = `
            UPDATE [User]
            SET name = @name, DOB = @dob, nationalID = @nationalID
            OUTPUT INSERTED.*
            WHERE id = @userId`;

        const request = new sql.Request(pool);
        request.input('userId', sql.Int, userId);
        request.input('name', sql.VarChar, name);
        request.input('dob', sql.Date, dob);
        request.input('nationalID', sql.VarChar, nationalID);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Return the updated user

    } catch (err) {
        console.error("Error in userModel.update:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}



module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    updateUsers,

};