const sql = require('mssql');
// 1. Corrected path
const dbConfig = require('../dbConfig'); 

async function createUser(userData) {
    console.log("Creating user with data:", userData);
    const { name, dob, nationalID, Email, bioType, BioData } = userData;
    let pool;
    try {
        pool = await sql.connect(dbConfig);

        // 1️⃣ Insert User first
        const requestUser = pool.request();
        requestUser.input('name', sql.VarChar, name);
        requestUser.input('dob', sql.Date, dob);
        requestUser.input('nationalID', sql.VarChar, nationalID);
        requestUser.input('Email', sql.VarChar, Email);

        const userResult = await requestUser.query(`
            INSERT INTO [User] (name, DOB, nationalID, Email)
            OUTPUT INSERTED.id
            VALUES (@name, @dob, @nationalID, @Email)
        `);

        const userId = userResult.recordset[0].id;

        // 2️⃣ If biometric data is provided, insert it
        if (bioType && BioData) {
            const bioReq = pool.request();
            let bioString;

            if (BioData instanceof Float32Array) {
                bioString = JSON.stringify(Array.from(BioData));
            } else if (typeof BioData === "string") {
                bioString = BioData;
            } else {
                throw new Error("BioData must be a Float32Array or string");
            }

            bioReq.input("userID", sql.Int, userId);
            bioReq.input("type", sql.VarChar, bioType);
            bioReq.input("bioData", sql.NVarChar(sql.MAX), bioString);

            await bioReq.query(`
                INSERT INTO Biometrics (userID, type, bioData)
                VALUES (@userID, @type, @bioData)
            `);
        }

        return userId;

    } catch (err) {
        console.error("Error in userModel.createUser:", err);
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


//Make biometrics MVC later
async function getAllBiometricsWithUser() {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT b.ID AS biometricID, b.bioData, b.type, u.id AS userId
            FROM Biometrics b
            INNER JOIN [User] u ON b.userID = u.id
        `);
        return result.recordset || []; // always return an array so no errors
    } catch (err) {
        console.error("Error in userModel.getAllBiometricsWithUser:", err);
        throw err;
    } finally {
        if (pool) pool.close();
    }
}



module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    findUserByEmail,
    getAllBiometricsWithUser
};