const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function optionalVerifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return next();              // ✅ allow normal transfer

  const token = authHeader.split(" ")[1];
  if (!token) return next();                   // ✅ allow normal transfer

  try {
    req.user = jwt.verify(token, JWT_SECRET);  // ✅ attach user if valid
  } catch (err) {
    req.user = null;                           // ✅ don't block, just treat as not verified
  }

  next();
}

module.exports = optionalVerifyToken;
