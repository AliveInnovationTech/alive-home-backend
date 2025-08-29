const { isTokenValid } = require("../app/utils/jwt");
const { StatusCodes } = require("http-status-codes");
const sequelize = require("./database");
const logger = require("../app/utils/logger");

const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Permission || !sequelize.models.Role) {
        throw new Error("Models not loaded yet");
    }
    return {
        User: sequelize.models.User,
        Role: sequelize.models.Role,
        Permission: sequelize.models.Permission,
    };
};

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: "Authentication invalid. No token provided.",
            });
        }

        const token = authHeader.split(" ")[1];
        let payload;

        try {
            payload = isTokenValid(token);
        } catch (err) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: `Authentication invalid. ${err.message}`,
            });
        }

        const { User, Role } = getModels();
        const user = await User.findByPk(payload.userId, {
            include: [{
                model: Role,
                as: "role",
                attributes: ["roleId", "name"],
            }],
        });

        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: "Authentication invalid. User not found.",
            });
        }

        req.user = {
            userId: user.userId,
            email: user.email,
            phoneNumber: user.phoneNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            roleName: user.role?.name,
        };

        logger.info("User authenticated successfully", {
            userId: user.userId,
            email: user.email,
            role: user.role?.name,
        });

        next();
    } catch (error) {
        logger.error("Authentication failed", {
            error: error.message,
            stack: error.stack,
        });
        return res.status(StatusCodes.UNAUTHORIZED).json({
            error: "Authentication invalid.",
        });
    }
};



const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                error: "Authentication required.",
            });
        }

        if (!allowedRoles.includes(req.user.roleName)) {
            return res.status(StatusCodes.FORBIDDEN).json({
                error: "Not authorized to access this route.",
            });
        }

        next();
    };
};


const authorizePermissions = (requiredPermissions = []) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(StatusCodes.UNAUTHORIZED).json({
                    error: 'Authentication required.'
                });
            }
            const { User, Role, Permission } = getModels()
            const user = await User.findByPk(req.user.userId, {
                include: {
                    model: Role,
                    include: [Permission]
                }
            });

            if (!user || !user.Role) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    error: 'Not authorized. No role assigned.'
                });
            }

            const userPermissions = user.Role.Permissions.map(p => p.name);

            const hasAllPermissions = requiredPermissions.every(p =>
                userPermissions.includes(p)
            );

            if (!hasAllPermissions) {
                return res.status(StatusCodes.FORBIDDEN).json({
                    error: 'Not authorized. Missing required permissions.'
                });
            }

            next();
        } catch (err) {
            logger.error('Permission check failed', { error: err.message, stack: err.stack });
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: 'Authorization check failed.'
            });
        }
    };
};


module.exports = {
    authenticateUser,
    authorizeRoles,
    authorizePermissions
};


