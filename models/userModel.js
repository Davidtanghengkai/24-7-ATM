const sql = require('mssql');
// 1. Corrected path
const dbConfig = require('../dbConfig'); 


async function createUser(userData) {
    const { name, dob, nationalID } = userData;
    let connection; // Changed from 'pool'
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `
            INSERT INTO Users (name, DOB, nationalID)
            OUTPUT INSERTED.id
            VALUES (@name, @dob, @nationalID)`;

        const request = connection.request(); // Use connection
        request.input('name', sql.NVarChar, name); // Use NVarChar for SQL Server
        request.input('dob', sql.Date, dob);
        request.input('nationalID', sql.NVarChar, nationalID); // Use NVarChar

        const result = await request.query(sqlStatement);
        return result.recordset[0].id; // Return the new ID

    } catch (err) {
        console.error("Error in userModel.createUser:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Gets a single user by their ID.
 */
async function getUserById(userId) {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        // 3. Standardized table name to Users
        const sqlStatement = `SELECT * FROM Users WHERE id = @userId`;

        const request = connection.request(); // Use connection
        request.input('userId', sql.Int, userId);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Returns the user object or undefined

    } catch (err) {
        console.error("Error in userModel.getUserById:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Gets all users from the database.
 */
async function getAllUsers() {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `SELECT * FROM Users`;
        
        const result = await connection.request().query(sqlStatement);
        return result.recordset; // Returns an array of users

    } catch (err) {
        console.error("Error in userModel.getAllUsers:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Updates an existing user's details.
 */
async function updateUsers(userId, userData) {
    const { name, dob, nationalID } = userData;
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const sqlStatement = `
            UPDATE Users
            SET name = @name, DOB = @dob, nationalID = @nationalID
            OUTPUT INSERTED.*
            WHERE id = @userId`;

        const request = connection.request(); // Use connection
        request.input('userId', sql.Int, userId);
        request.input('name', sql.NVarChar, name);
        request.input('dob', sql.Date, dob);
        request.input('nationalID', sql.NVarChar, nationalID);

        const result = await request.query(sqlStatement);
        return result.recordset[0]; // Return the updated user

    } catch (err) {
        console.error("Error in userModel.updateUsers:", err);
        throw err;
    } finally {
        if (connection) await connection.close(); // Close connection
    }
}

/**
 * Finds a user by their email address.
 */
const findUserByEmail = async (email) => {
    let connection;
    try {
        connection = await sql.connect(dbConfig); // Open connection
        const userResult = await connection.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');
        
        if (userResult.recordset.length > 0) {
            return userResult.recordset[0]; // Return the user object
        }
        return null; // No user found
    } catch (err) {
        console.error('Database query error (findUserByEmail):', err);
        throw err; // Re-throw error to be caught by controller
    } finally {
        if (connection) await connection.close(); // Close connection
    }
};

module.exports = {
    findUserByEmail,
    createUser,
    getUserById,
    getAllUsers,
    updateUsers,
};