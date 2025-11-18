const sql = require("mssql");
const dbConfig = require("../config/dbConfig");

async function getCountries(){
  let connection;
  try{
    connection = await sql.connect(dbConfig);
    const result = await connection.request()
      .query(`SELECT DISTINCT country FROM Bank ORDER BY country`);
    return result.recordset;
  } catch (err) {
    console.error("DB Error (getCountries):", err.message);
    throw err;
  }
  finally {
    if (connection) await connection.close();
  }
}

async function getBanksByCountry(country) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const result = await connection.request()
      .input("country", sql.VarChar(50), country)
      .query(`SELECT bankID, bankName, country, currency FROM Bank WHERE country = @country`);

    return result.recordset;
  } catch (err) {
    console.error("DB Error (getBanksByCountry):", err.message);
    throw err;
  } finally {
    if (connection) await connection.close();
  }
}


module.exports = { getCountries, getBanksByCountry };
