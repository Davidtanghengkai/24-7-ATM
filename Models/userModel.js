const sql = require('mssql');
// 1. Corrected path
const dbConfig = require('../dbConfig'); 


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



module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    findUserByEmail,
    getAllBiometrics
};