const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000; 

// --- 1. MIDDLEWARE ---
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- 2. IMPORT & USE ROUTES ---
const userController = require('./Controllers/userController');

//routes
app.get('/user', userController.getAllUsers);                   // get all users
app.get('/user/:id', userController.getUserById);          // get user by ID
app.post('/user', userController.createUser);              // create user + biometrics entry

// Accounts
app.get('/accounts/:userId', userController.getAccountsByUserId); // get accounts for user
app.post('/accounts', userController.createAccount); // create new account for user

// Cards
app.get('/cards/:userId/:accountNo', userController.getCardsByUserIdandAccountId); // get cards for user account
app.post('/cards', userController.createCard);  // create new card for account tied to user

// Biometrics
app.get('/biometrics', userController.getAllBiometrics);         // get all biometrics

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`API documentation: http://localhost:${port}/api-docs`);
});

process.on("SIGINT", async () => {
    console.log("Server is gracefully shutting down");
    server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });
});

//API Documentation setup
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json"); // Import generated spec

// Serve the Swagger UI at a specific route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
