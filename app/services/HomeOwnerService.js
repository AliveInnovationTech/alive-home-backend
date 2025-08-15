"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const homeOwnerValidator = require("../validators/HomeOwnerValidator");
const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");

const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Owner) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Owner: sequelize.models.Owner
    };
};

exports.createHomeOwnerProfile = async (payload, user) => {
    try {
        const validatorError = await homeOwnerValidator.createHomeOwnerProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Owner } = getModels();

        // Check if user already has a homeowner profile
        const existingOwner = await Owner.findOne({
            where: { userId: user.userId }
        });

        if (existingOwner) {
            return {
                error: "User already has a homeowner profile",
                statusCode: StatusCodes.CONFLICT
            };
        }

        const owner = await Owner.create({
            userId: user.userId,
            primaryResidence: payload.primaryResidence,
            ownershipVerified: false,
            preferredContactMethod: payload.preferredContactMethod || 'EMAIL',
            verificationDocsUrls: payload.verificationDocsUrls || []
        });

        const ownerWithUser = await Owner.findByPk(owner.ownerId, {
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

        logInfo('Homeowner profile created successfully', { ownerId: ownerWithUser.ownerId, userId: user.userId });
        
        return {
            data: {
                ownerId: ownerWithUser.ownerId,
                primaryResidence: ownerWithUser.primaryResidence,
                ownershipVerified: ownerWithUser.ownershipVerified,
                preferredContactMethod: ownerWithUser.preferredContactMethod,
                verificationDocsUrls: ownerWithUser.verificationDocsUrls,
                user: ownerWithUser.user
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('HomeOwnerService', 'createHomeOwnerProfile', e, 'An error occurred while creating homeowner profile');
    }
};

exports.getHomeOwnerProfile = async (ownerId) => {
    try {
        const { User, Owner } = getModels();

        const owner = await Owner.findByPk(ownerId, {
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

        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                ownerId: owner.ownerId,
                primaryResidence: owner.primaryResidence,
                ownershipVerified: owner.ownershipVerified,
                preferredContactMethod: owner.preferredContactMethod,
                verificationDocsUrls: owner.verificationDocsUrls,
                user: owner.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving homeowner profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.updateHomeOwnerProfile = async (ownerId, payload, user) => {
    try {
        const validatorError = await homeOwnerValidator.updateHomeOwnerProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Owner } = getModels();

        const owner = await Owner.findByPk(ownerId);
        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin or superadmin
        if (owner.userId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
            return {
                error: "Unauthorized to update this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const updateData = {};
        const allowedFields = [
            'primaryResidence',
            'preferredContactMethod',
            'verificationDocsUrls'
        ];

        allowedFields.forEach(field => {
            if (payload[field] !== undefined) {
                updateData[field] = payload[field];
            }
        });

        await owner.update(updateData);

        const updatedOwner = await Owner.findByPk(ownerId, {
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
                ownerId: updatedOwner.ownerId,
                primaryResidence: updatedOwner.primaryResidence,
                ownershipVerified: updatedOwner.ownershipVerified,
                preferredContactMethod: updatedOwner.preferredContactMethod,
                verificationDocsUrls: updatedOwner.verificationDocsUrls,
                user: updatedOwner.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while updating homeowner profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getAllHomeOwners = async (page = 1, limit = 10, search = '') => {
    try {
        const { User, Owner } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        if (search) {
            whereClause.primaryResidence = {
                [require('sequelize').Op.iLike]: `%${search}%`
            };
        }

        const { rows: owners, count: totalOwners } = await Owner.findAndCountAll({
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
                        'profilePictureUrl'
                    ]
                }
            ],
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']]
        });

        const data = owners.map(owner => ({
            ownerId: owner.ownerId,
            primaryResidence: owner.primaryResidence,
            ownershipVerified: owner.ownershipVerified,
            preferredContactMethod: owner.preferredContactMethod,
            verificationDocsUrls: owner.verificationDocsUrls,
            user: owner.user
        }));

        return {
            data,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalOwners,
                totalPages: Math.ceil(totalOwners / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while fetching homeowners:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.deleteHomeOwnerProfile = async (ownerId, user) => {
    try {
        const { User, Owner } = getModels();
        const owner = await Owner.findByPk(ownerId);
        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin or superadmin
        if (owner.userId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
            return {
                error: "Unauthorized to delete this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        await owner.destroy();

        return {
            data: {
                message: "Homeowner profile deleted successfully"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while deleting homeowner profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.verifyHomeOwner = async (ownerId, verified, user) => {
    try {
        const { User, Owner } = getModels();

        // Only admins can verify homeowners
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return {
                error: "Unauthorized to verify homeowners",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const owner = await Owner.findByPk(ownerId);
        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        await owner.update({ ownershipVerified: verified });

        return {
            data: {
                ownerId: owner.ownerId,
                primaryResidence: owner.primaryResidence,
                ownershipVerified: owner.ownershipVerified,
                message: `Homeowner ${verified ? 'verified' : 'unverified'} successfully`
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while verifying homeowner:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getMyHomeOwnerProfile = async (userId) => {
    try {
        const { User, Owner } = getModels();
        const owner = await Owner.findOne({
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

        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                ownerId: owner.ownerId,
                primaryResidence: owner.primaryResidence,
                ownershipVerified: owner.ownershipVerified,
                preferredContactMethod: owner.preferredContactMethod,
                verificationDocsUrls: owner.verificationDocsUrls,
                user: owner.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving my homeowner profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.uploadVerificationDocuments = async (ownerId, files, user) => {
    try {
        const { User, Owner } = getModels();
        const owner = await Owner.findByPk(ownerId);
        if (!owner) {
            return {
                error: "Homeowner profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (owner.userId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
            return {
                error: "Unauthorized to upload documents for this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        if (!files || files.length === 0) {
            return {
                error: "No files uploaded",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }
        // Upload files to Cloudinary and get their URLs
        const uploadedUrls = [];
        for (const file of files) {
            const result = await cloudinary.uploadFile(file.path, {
                folder: "homeowner_verification_docs"
            });
            if (result && result.secure_url) {
                uploadedUrls.push(result.secure_url, result.public_id);
            }
        }
        const updatedUrls = [...(owner.verificationDocsUrls || []), ...uploadedUrls];

        await owner.update({
            verificationDocsUrls: updatedUrls,
            cloudinary_ids: uploadedUrls.map(url => url.public_id)
        });

        return {
            data: {
                ownerId: owner.ownerId,
                verificationDocsUrls: updatedUrls,
                message: "Verification documents uploaded successfully"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while uploading verification documents:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};
