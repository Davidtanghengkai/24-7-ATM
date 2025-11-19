const jwt = require('jsonwebtoken');

// Secret key (store in .env)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Generate JWT token for a user
function generateToken(user) {
    // user can be { id: 123, name: "John Doe" } etc.
    return jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '1h' });
}

// Middleware to verify token
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: "Authorization header missing" });

    const token = authHeader.split(' ')[1]; // Expected format: "Bearer <token>"
    if (!token) return res.status(401).json({ message: "Token missing" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // attach decoded payload to request
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
}

module.exports = {
    generateToken,
    verifyToken
};