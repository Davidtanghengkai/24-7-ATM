const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000; 

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


//// Swagger Setup for API Documentation
const swaggerUi = require("swagger-ui-express");
let swaggerDocument;

// Safely load swagger-output.json
try {
    swaggerDocument = require("./swagger-output.json");
} catch (err) {
    console.error("Swagger file not found. Run `node swagger.js` to generate swagger-output.json.");
    swaggerDocument = { swagger: "2.0", info: { title: "API Docs", description: "Missing swagger-output.json" } };
}

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


const userController = require('./Controllers/userController');

// User routes
app.get('/user', userController.getAllUsers);                   // get all users
app.get('/user/:id', userController.getUserById);          // get user by ID
app.post('/user', userController.createUser);              // create user + biometrics entry

// Accounts routes
app.get('/accounts/:userId', userController.getAccountsByUserId); // get accounts for user
app.post('/accounts', userController.createAccount); // create new account for user

// Cards routes
app.get('/cards/:userId/:accountNo', userController.getCardsByUserIdandAccountId); // get cards for user account
app.post('/cards', userController.createCard);  // create new card for account tied to user

// Biometrics routes
app.get('/biometrics', userController.getAllBiometrics);         // get all biometrics


// Start server
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/Index.html`);
    console.log(`API documentation: http://localhost:${port}/api-docs`);
});

process.on("SIGINT", async () => {
    console.log("Server is gracefully shutting down");
    server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });
});
