const express = require('express');
const dotenv = require("dotenv");
const cors = require('cors'); 
const path = require("path");
const session = require("express-session");

dotenv.config();

//Initialize Express App
const app = express();
const port = process.env.PORT || 3000; 

// Middlewares
app.use(cors()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-dev-secret-key', // Use an env variable
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 15 * 60 * 1000 // 15 minutes to match OTP expiry
    }
}));


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

// Controllers
const userController = require('./Controllers/userController');
const cardController = require('./Controllers/cardController');
const otpController = require('./Controllers/otpController');
const accountController = require('./Controllers/accountController');
const transactionController = require("./controllers/transactionController");
const bankController= require("./controllers/bankController");
const blockchainUserController = require("./controllers/blockchainUserController");
const exchangeRateController = require("./controllers/exchangeRateController");
const translationController = require("./controllers/translationController");
// Middlewares
const  validateTransfer = require("./middleware/validateTransfer");

//Routes

// == User Routes ==
app.post('/api/users', userController.createUser);
app.get('/api/users/:id', userController.getUserById);
app.get('/api/users', userController.getAllUsers);
app.get('/api/users/find', userController.findUserByEmail);
app.get('/api/biometrics', userController.getAllBiometrics);

// == Card Routes ==
app.post('/api/cards', cardController.createCard);
app.get('/api/cards/:cardNo', cardController.getCardByNo);
app.get('/api/cards/user/:userId', cardController.getCardsForUser);
app.put('/api/cards/status/:cardNo', cardController.changeStatus);
app.delete('/api/cards/:cardNo', cardController.deleteCard);
app.get('/api/cards/active/user/:userId', cardController.findCardsByUserId);



// == OTP Routes ==

app.post('/api/send-otp', otpController.sendOtp);
app.post('/api/verify-otp', otpController.verifyOtp);

// == Translation routes ==
app.post('/api/translations', translationController.getTranslations);

// Oversea Transfer Routes
app.get("/api/countries", bankController.fetchCountries);
app.get("/api/banks/:country", bankController.fetchBanks);
app.post("/api/transfer", validateTransfer, transactionController.createOverseasTransaction);
app.post("/api/blockchain-user", blockchainUserController.addBlockchainUser);
app.get("/api/accounts/:accountNo/balance", accountController.fetchBalance);
//Exchange rate proxy endpoint
app.get("/api/rate", exchangeRateController.fetchExchangeRate);

// --- Base Route Just In Case ---
app.get('/', (req, res) => {
    res.send('How did we get here?');
});

// Watson Assistant Routes
const watsonRoutes = require('./routes/api/watson');
app.use('/api/watson', watsonRoutes);


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