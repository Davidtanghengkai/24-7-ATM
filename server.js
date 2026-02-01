const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require("dotenv");
const cors = require('cors'); 
const path = require("path");
const session = require("express-session");
const jwt = require('jsonwebtoken');
const { ExpressPeerServer } = require('peer');


dotenv.config();

//Initialize Express App
const app = express();
const MobServer = http.createServer(app);
const io = new Server(MobServer, {       
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    }             
});
// ===== PeerJS Server (embedded) =====
const peerServer = ExpressPeerServer(MobServer, {
  debug: true
});
app.use('/peerjs', peerServer);

const port = process.env.PORT || 3000; 



// Middlewares
app.use(cors()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

app.use(session({
    secret: process.env.SESSION_SECRET || 'a-very-strong-dev-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 15 * 60 * 1000
    }
}));

app.use(express.static(path.join(__dirname, "public"), { index: false }));


//// Swagger Setup for API Documentation
const swaggerUi = require("swagger-ui-express");
let swaggerDocument;

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
const transactionController = require("./Controllers/transactionController");
const bankController= require("./controllers/bankController");
const blockchainUserController = require("./controllers/blockchainUserController");
const exchangeRateController = require("./controllers/exchangeRateController");
const translationController = require("./controllers/translationController");

// Middlewares
const  validateTransfer = require("./middleware/validateTransfer");
const optionalVerifyToken = require("./middleware/optionalAuth");
//Routes

// == User Routes ==
app.post('/api/users', userController.createUser);
app.get('/api/users/:id', userController.getUserById);
app.get('/api/users', userController.getAllUsers);
app.get('/api/users/find', userController.findUserByEmail);
app.get('/api/biometrics', userController.getAllBiometrics);
app.post('/api/users/loginWithFace', userController.loginWithFace);
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'MobIndex.html'));
});
app.post('/api/users/verifyMobLogin', userController.verifyMobLogin); 

// == Card Routes ==
app.post('/api/cards', cardController.createCard);
app.get('/api/cards/:cardNo', cardController.getCardByNo);
app.get('/api/cards/user/:userId', cardController.getCardsForUser);
app.put('/api/cards/status/:cardNo', cardController.changeStatus);
app.delete('/api/cards/:cardNo', cardController.deleteCard);
app.get('/api/cards/active/user/:userId/account/:accountNo', cardController.findCardsByUserId);

// == Account Routes ==
app.put("/api/accounts/freeze/:accountNo", accountController.freezeAccount);
app.put("/api/accounts/freeze-all/:userId", accountController.freezeAllAccounts);

app.post('/api/accounts', accountController.createAccount);
app.get('/api/accounts/user/:userId', accountController.getAccountsByUserId);
app.post("/api/accounts/deposit", accountController.addBalance);
app.post("/api/accounts/withdraw", accountController.withdraw);

// == OTP Routes ==
app.post('/api/send-otp', otpController.sendOtp);
app.post('/api/verify-otp', otpController.verifyOtp);

// == Translation routes ==
app.post('/api/translations', translationController.getTranslations);

// Oversea Transfer Routes
app.get("/api/countries", bankController.fetchCountries);
app.get("/api/banks/:country", bankController.fetchBanks);
app.post("/api/transfer",validateTransfer,optionalVerifyToken, transactionController.createOverseasTransaction);
app.post("/api/blockchain-user", blockchainUserController.addBlockchainUser);
app.get("/api/accounts/:accountNo/transactions", transactionController.getHistory);
app.get("/api/accounts/:accountNo/balance", accountController.fetchBalance);

//Exchange rate proxy endpoint
app.get("/api/rate", exchangeRateController.fetchExchangeRate);

// --- Base Route ---
app.get('/info', (req, res) => {
    res.send('How did we get here?');
});

// Watson Assistant Routes
const watsonRoutes = require('./routes/api/watson');
app.use('/api/watson', watsonRoutes);


// WEBSOCKET SETUP



// Store connected clients
const connectedClients = new Map();
io.on('connection', (socket) => {
    console.log('✓ New device connected:', socket.id);
    socket.on('join-station', (stationId) => {
        socket.join(stationId);
        connectedClients.set(socket.id, { type: 'atm', stationId });
        console.log(`✓ Station ${stationId} joined (Socket: ${socket.id})`);
        socket.emit('station-joined', { stationId, socketId: socket.id });
    });

    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-connected', userId);

        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId);
        });
    });

    socket.on('nfc-trigger', (data) => {
        console.log(`NFC Trigger received:`, {
            jwtToken: data.jwtToken ? '✓ Present' : '✗ Missing',
            userId: data.userId,
            selectedCardId: data.selectedCardId,
            selectedAccountNo: data.selectedAccountNo,
            stationId: data.stationId
        });
        
        // Validate required fields
        if (!data.stationId) {
            console.error('❌ Invalid NFC trigger data - Missing stationId:', data);
            socket.emit('nfc-error', { message: 'Missing stationId' });
            return;
        }

        io.to(data.stationId).emit('login-command', {
            jwtToken: data.jwtToken,
            userId: data.userId,
            selectedCardId: data.selectedCardId,
            selectedAccountNo: data.selectedAccountNo,
            
            userName: data.userName || 'User',
            stationId: data.stationId
        }); 
        console.log(`✓ Login command sent to station: ${data.stationId}`);
        
        socket.emit('nfc-sent', { 
            stationId: data.stationId,
            success: true 
        });
    });

    socket.on('phone_button_click', (data) => {
        console.log('Phone button clicked:', data);
        io.emit('phone-action', data);
    });

    // --- New Authentication Approval Events ---

    // Mobile joins a room specific to the user
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`✓ User ${userId} joined their mobile room (Socket: ${socket.id})`);
    });

    // ATM signals it's waiting for mobile approval
    socket.on('atm-waiting-auth', (data) => {
        console.log(`ATM ${data.stationId} waiting for user ${data.userId} approval`);
        // Send request to the user's mobile devices
        io.to(`user-${data.userId}`).emit('mobile-auth-request', {
            stationId: data.stationId,
            userId: data.userId
        });
    });

    // Mobile responds to the approval request
    socket.on('mobile-auth-response', (data) => {
        console.log(`Mobile response for user ${data.userId}: ${data.approved ? 'Approved' : 'Denied'}`);
        // Send result back to the specific ATM station
        io.to(data.stationId).emit('atm-auth-result', {
            approved: data.approved,
            userId: data.userId
        });
    });

    socket.on('disconnect', () => {
        const clientInfo = connectedClients.get(socket.id);
        if (clientInfo) {
            console.log(`✗ Device disconnected: ${clientInfo.type} - ${clientInfo.stationId || socket.id}`);
            connectedClients.delete(socket.id);
        } else {
            console.log('✗ Device disconnected:', socket.id);
        }
    });
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});


//Chatrooms 
const { v4: uuidV4 } = require('uuid');
//const sio = require('socket.io')(Server);


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`)
})
app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room })
});





// START SERVER


MobServer.listen(port, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log(`Server running on http://localhost:${port}/Index.html`);
    console.log(`API documentation: http://localhost:${port}/api-docs`);
    console.log(`Mobile app: http://localhost:${port}/mobile`);
    console.log('========================================\n');
});
process.on("SIGINT", async () => {
    console.log("\n  Server is gracefully shutting down...");  
    // io.close(() => {
    //     console.log("✓ WebSocket connections closed");
    // });  
    // MobServer.close(() => {
    //     console.log("✓ HTTP server closed");
    //     process.exit(0);
    // });
    io.close();
    MobServer.close();
    process.exit(0);

});


