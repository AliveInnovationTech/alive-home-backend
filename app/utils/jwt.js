const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in environment variables");
}

const defaultOptions = {
    expiresIn: process.env.JWT_LIFETIME || "1h",
};

const createJWT = ({ payload, options = {} }) => {
    return jwt.sign(payload, JWT_SECRET, {
        ...defaultOptions,
        ...options,
    });
};

const isTokenValid = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new Error("Token expired");
        }
        if (err.name === "JsonWebTokenError") {
            throw new Error("Invalid token");
        }
        throw new Error("Token verification failed");
    }
};
module.exports = {
    isTokenValid,
    createJWT
};