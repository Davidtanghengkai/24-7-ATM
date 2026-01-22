const sql = require('mssql');
// 1. Corrected path
const dbConfig = require('../dbConfig'); 

async function createUser(userData) {
    console.log("Creating user with data:", userData);
    const { name, dob, nationalID, Email, LoginPin, bioType, BioData } = userData;

    const AccessCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    let pool;
    try {
        pool = await sql.connect(dbConfig);

        const requestUser = pool.request();
        requestUser.input('name', sql.VarChar, name);
        requestUser.input('dob', sql.Date, dob);
        requestUser.input('nationalID', sql.VarChar, nationalID);
        requestUser.input('Email', sql.VarChar, Email);
        requestUser.input('LoginPin', sql.VarChar, LoginPin);
        requestUser.input('AccessCode', sql.VarChar, AccessCode);

        const userResult = await requestUser.query(`
            INSERT INTO [User] (name, DOB, nationalID, Email, LoginPin, AccessCode)
            OUTPUT INSERTED.id, INSERTED.AccessCode
            VALUES (@name, @dob, @nationalID, @Email, @LoginPin, @AccessCode)
        `);

        const userId = userResult.recordset[0].id;
        const generatedCode = userResult.recordset[0].AccessCode;

        // 2️⃣ Insert biometric if provided
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

        // Return both userId and AccessCode
        return { userId, AccessCode: generatedCode };

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

//WebSocket function for mobile 
async function verifyMobLogin(accessCode, loginPin) {
    let pool;
    try {
        pool = await sql.connect(dbConfig);
        const request = pool.request();
        request.input('accessCode', sql.VarChar, accessCode);
        request.input('loginPin', sql.VarChar, loginPin);

        const query = "SELECT id, name FROM [User] WHERE accessCode = @accessCode AND LoginPin = @loginPin";
        const result = await request.query(query);

        return result.recordset[0]; 
    } catch (err) {
        throw new Error("Model Error: " + err.message);
    } finally {
        if (pool) await pool.close();
    } 
}




module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    findUserByEmail,
    getAllBiometricsWithUser,
    verifyMobLogin
};