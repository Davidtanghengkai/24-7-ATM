const express = require('express');
const sql = require('mssql');
const cors = require('cors');

// NEW: Import the config from your new file
const dbConfig = require('/dbConfig');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database using the imported config
sql.connect(dbConfig).then(() => {
    console.log('✅ Connected to SQL Database');
}).catch(err => {
    console.error('❌ Database Connection Failed:', err);
});

// Test Route
app.get('/', (req, res) => {
    res.send('ATM Backend is running!');
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});