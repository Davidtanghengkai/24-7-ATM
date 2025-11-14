const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000; 

// --- 1. MIDDLEWARE ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- 2. IMPORT & USE ROUTES ---
const userRoutes = require('./routes/userRoutes');
const biometricRoutes = require('./routes/biometricRoutes');

//routes
app.use('/user', userRoutes);
app.use('/biometric', biometricRoutes); 

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    
    console.log("\nRegistered User routes:");
    console.log("  POST   /user/create");
    console.log("  GET    /user/");
    console.log("  GET    /user/:id");
    console.log("  PUT    /user/:id");
    console.log("  DELETE /user/:id");

    console.log("\nRegistered Biometric routes:"); // <-- NEW
    console.log("  POST   /biometric/");
    console.log("  GET    /biometric/user/:userId");
    console.log("  DELETE /biometric/:id");
});