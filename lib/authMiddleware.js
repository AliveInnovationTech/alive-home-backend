"use strict";
const { isTokenValid } = require("../app/utils/jwt");
const { StatusCodes } = require("http-status-codes");
const sequelize = require("./database");
const { User } = sequelize.models;
const logger = require("../app/utils/logger");

const authenticateUser = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: 'Authentication invalid. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const payload = isTokenValid(token);
        if (!payload) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: 'Authentication invalid. Invalid token.'
            });
        }

        // Get user from database
        const user = await User.findByPk(payload.user.userId);
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: 'Authentication invalid. User not found.'
            });
        }

        // Set user in request
        req.user = {
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.roleId 
        };

        logger.info('User authenticated successfully', { userId: user.userId, email: user.email });
        next();
    } catch (error) {
        logger.error('Authentication failed', { error: error.message, stack: error.stack });
        return res.status(StatusCodes.UNAUTHORIZED).json({
            error: 'Authentication invalid.'
        });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: 'Authentication required.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: 'Not authorized to access this route.'
            });
        }

        next();
    };
};

module.exports = {
    authenticateUser,
    authorizeRoles
};
