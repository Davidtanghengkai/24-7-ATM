const express = require('express');
const cors = require('cors'); 

// --- Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 3000; 

// --- Core Middlewares ---
app.use(cors()); 
app.use(express.json()); 

// --- Import Controllers ---
// We import the logic directly from your controller files
const userController = require('./controllers/userController');
const cardController = require('./controllers/cardController');
const otpController = require('./controllers/otpController');

// --- API Routes ---

// == User Routes ==
// (From userController.js)
app.post('/api/users', userController.createUser);
app.get('/api/users', userController.getAllUsers);
app.get('/api/users/find', userController.findUserByEmail); // Must be before /:id
app.get('/api/users/:id', userController.getUserById);
app.put('/api/users/:id', userController.updateUser);

// == Card Routes ==
// (From cardController.js)
app.post('/api/cards', cardController.createCard);
app.get('/api/cards/user/:userId', cardController.getCardsForUser);
app.get('/api/cards/active/user/:userId', cardController.findActiveCardByUserId);
app.get('/api/cards/:cardNo', cardController.getCardByNo);
app.put('/api/cards/status/:cardNo', cardController.changeStatus);
app.delete('/api/cards/:cardNo', cardController.deleteCard);
// Note: The route for 'updateCardOtp' is left out because 
// your cardController.js file does not export that function.

// == OTP Routes ==
// (From otpController.js)
app.post('/api/otp/send', otpController.sendOtp);

// --- Base Route ---
app.get('/', (req, res) => {
    res.send('API is running successfully!');
});

// --- Start The Server ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});