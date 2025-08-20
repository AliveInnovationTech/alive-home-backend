"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const buyerValidator = require("../validators/BuyerValidator");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const propertyService = require("./PropertyService")

// Wait for models to be loaded
const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Buyer) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Buyer: sequelize.models.Buyer
    };
};

exports.createBuyerProfile = async (payload, user) => {
    try {
        const validatorError = await buyerValidator.createBuyerProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Buyer } = getModels();

        // Check if user already has a buyer profile
        const existingBuyer = await Buyer.findOne({
            where: { userId: user.userId }
        });

        if (existingBuyer) {
            return {
                error: "User already has a buyer profile",
                statusCode: StatusCodes.CONFLICT
            };
        }

        const buyer = await Buyer.create({
            userId: user.userId,
            minimumBudget: payload.minimumBudget,
            maximumBudget: payload.maximumBudget,
            preApproved: payload.preApproved || false,
            preApprovalAmount: payload.preApprovalAmount,
            preferredLocations: payload.preferredLocations || [],
            propertyType: payload.propertyType || 'HOUSE',
        });

        const buyerWithUser = await Buyer.findByPk(buyer.buyerId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl'
                    ]
                }
            ]
        });

        logInfo('Buyer profile created successfully', { buyerId: buyerWithUser.buyerId, userId: user.userId });

        return {
            data: {
                buyerId: buyerWithUser.buyerId,
                minimumBudget: buyerWithUser.minimumBudget,
                maximumBudget: buyerWithUser.maximumBudget,
                preApproved: buyerWithUser.preApproved,
                preApprovalAmount: buyerWithUser.preApprovalAmount,
                preferredLocations: buyerWithUser.preferredLocations,
                propertyType: buyerWithUser.propertyType,
                user: buyerWithUser.user
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('BuyerService', 'createBuyerProfile', e, 'An error occurred while creating buyer profile');
    }
};

exports.getBuyerProfile = async (buyerId) => {
    try {
        const { User, Buyer } = getModels();

        const buyer = await Buyer.findByPk(buyerId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl'
                    ]
                }
            ]
        });

        if (!buyer) {
            return {
                error: "Buyer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                buyerId: buyer.buyerId,
                minimumBudget: buyer.minimumBudget,
                maximumBudget: buyer.maximumBudget,
                preApproved: buyer.preApproved,
                preApprovalAmount: buyer.preApprovalAmount,
                preferredLocations: buyer.preferredLocations,
                propertyType: buyer.propertyType,
                user: buyer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving buyer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.updateBuyerProfile = async (buyerId, payload, user) => {
    try {
        const validatorError = await buyerValidator.updateBuyerProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Buyer } = getModels();

        const buyer = await Buyer.findByPk(buyerId);
        if (!buyer) {
            return {
                error: "Buyer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (buyer.userId !== user.userId && user.role !== 'ADMIN' && user.role !== 'SYSADMIN') {
            return {
                error: "Unauthorized to update this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const updateData = {};
        const allowedFields = [
            'minimumBudget',
            'maximumBudget',
            'preferredLocations',
            'propertyType',
        ];

        allowedFields.forEach(field => {
            if (payload[field] !== undefined) {
                updateData[field] = payload[field];
            }
        });

        await buyer.update(updateData);

        const updatedBuyer = await Buyer.findByPk(buyerId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl']
                }
            ]
        });

        return {
            data: {
                buyerId: updatedBuyer.buyerId,
                minimumBudget: updatedBuyer.minimumBudget,
                maximumBudget: updatedBuyer.maximumBudget,
                preApproved: updatedBuyer.preApproved,
                preApprovalAmount: updatedBuyer.preApprovalAmount,
                preferredLocations: updatedBuyer.preferredLocations,
                propertyType: updatedBuyer.propertyType,
                user: updatedBuyer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while updating buyer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getAllBuyers = async (page = 1, limit = 10, search = '', propertyType = '', minBudget = '', maxBudget = '') => {
    try {
        const { User, Buyer } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};

        // Search by user name or email
        if (search) {
            whereClause['$user.firstName$'] = {
                [require('sequelize').Op.iLike]: `%${search}%`
            };
        }

        // Filter by property type
        if (propertyType) {
            whereClause.propertyType = propertyType;
        }

        // Filter by budget range
        if (minBudget) {
            whereClause.minimumBudget = {
                [require('sequelize').Op.gte]: parseFloat(minBudget)
            };
        }

        if (maxBudget) {
            whereClause.maximumBudget = {
                [require('sequelize').Op.lte]: parseFloat(maxBudget)
            };
        }

        const { rows: buyers, count: totalBuyers } = await Buyer.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl']
                }
            ],
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']]
        });

        const data = buyers.map(buyer => ({
            buyerId: buyer.buyerId,
            minimumBudget: buyer.minimumBudget,
            maximumBudget: buyer.maximumBudget,
            preApproved: buyer.preApproved,
            preApprovalAmount: buyer.preApprovalAmount,
            preferredLocations: buyer.preferredLocations,
            propertyType: buyer.propertyType,
            user: buyer.user
        }));

        return {
            data,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalBuyers,
                totalPages: Math.ceil(totalBuyers / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while fetching buyers:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.deleteBuyerProfile = async (buyerId, user) => {
    try {
        const { User, Buyer } = getModels();

        const buyer = await Buyer.findByPk(buyerId);
        if (!buyer) {
            return {
                error: "Buyer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (buyer.userId !== user.userId && user.role !== 'ADMIN' && user.role !== 'SYSADMIN') {
            return {
                error: "Unauthorized to delete this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        await buyer.destroy();

        return {
            data: {
                message: "Buyer profile deleted successfully"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while deleting buyer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};



exports.updatePreApprovalStatus = async (buyerId, payload, user) => {
    try {
        const validatorError = await buyerValidator.updatePreApprovalStatus(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Buyer } = getModels();

        const buyer = await Buyer.findByPk(buyerId);
        if (!buyer) {
            return {
                error: "Buyer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (buyer.userId !== user.userId && user.role !== 'ADMIN' && user.role !== 'SYSADMIN') {
            return {
                error: "Unauthorized to update this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const updateData = {};
        if (payload.preApproved !== undefined) {
            updateData.preApproved = payload.preApproved;
        }
        if (payload.preApprovalAmount !== undefined) {
            updateData.preApprovalAmount = payload.preApprovalAmount;
        }

        await buyer.update(updateData);

        const updatedBuyer = await Buyer.findByPk(buyerId, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl'
                    ]
                }
            ]
        });

        return {
            data: {
                buyerId: updatedBuyer.buyerId,
                minimumBudget: updatedBuyer.minimumBudget,
                maximumBudget: updatedBuyer.maximumBudget,
                preApproved: updatedBuyer.preApproved,
                preApprovalAmount: updatedBuyer.preApprovalAmount,
                preferredLocations: updatedBuyer.preferredLocations,
                propertyType: updatedBuyer.propertyType,
                user: updatedBuyer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while updating pre-approval status:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getMyBuyerProfile = async (userId) => {
    try {
        const { User, Buyer } = getModels();

        const buyer = await Buyer.findOne({
            where: { userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: [
                        'userId',
                        'firstName',
                        'lastName',
                        'email',
                        'phoneNumber',
                        'profilePictureUrl'
                    ]
                }
            ]
        });

        if (!buyer) {
            return {
                error: "Buyer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                buyerId: buyer.buyerId,
                minimumBudget: buyer.minimumBudget,
                maximumBudget: buyer.maximumBudget,
                preApproved: buyer.preApproved,
                preApprovalAmount: buyer.preApprovalAmount,
                preferredLocations: buyer.preferredLocations,
                propertyType: buyer.propertyType,
                user: buyer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving my buyer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.searchProperties = async (buyerId, query) => {
    try {
        const { Buyer } = getModels();

        const buyer = await Buyer.findByPk(buyerId);
        if (!buyer) {
            return {
                error: "Oops! This buyer profile is not found on this platform",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const filters = {
            ...query?.filters,
            propertyType: buyer.propertyType || query?.filters?.propertyType,
            minPrice: buyer.minimumBudget || query?.filters?.minPrice,
            maxPrice: buyer.maximumBudget || query?.filters?.maxPrice
        };

        const propertySearch = await propertyService.searchProperties(
            query?.searchTerm || "",
            filters,
            query?.page || 1,
            query?.limit || 10
        );

        if (propertySearch.error) {
            return propertySearch;
        }

        return {
            data: {
                buyerId: buyer.buyerId,
                properties: propertySearch.data,
                totalProperties: propertySearch.pagination.totalProperties,
                pagination: propertySearch.pagination
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.log("An error occurred while searching properties:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};
