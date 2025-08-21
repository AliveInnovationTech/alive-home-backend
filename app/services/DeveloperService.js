"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const developerValidator = require("../validators/DeveloperValidator");
const cloudinary = require("../utils/cloudinary")
const { handleServiceError, logInfo } = require("../utils/errorHandler");



const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Developer) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Developer: sequelize.models.Developer
    };
};


exports.createDeveloperProfile = async (payload, user, file) => {
    try {
        const validatorError = await developerValidator.createDeveloperProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Developer } = getModels();

        const existingDeveloper = await Developer.findOne({
            where: { userId: user.userId }
        });

        if (existingDeveloper) {
            return {
                error: "User already has a developer profile",
                statusCode: StatusCodes.CONFLICT
            };
        }

        const result = await cloudinary.uploader.upload(file.path, {
            folder: "Alive/developers",
            resource_type: "image",
            height: 400,
            width: 400,
            crop: "scale"

        })

        const developer = await Developer.create({
            userId: user.userId,
            companyName: payload.companyName,
            cacRegNumber: payload.cacRegNumber,
            yearsInBusiness: payload.yearsInBusiness,
            projectsCompleted: payload.projectsCompleted || 0,
            websiteUrl: payload.websiteUrl,
            officeAddress: payload.officeAddress,
            companyLogoUrl: result.secure_url,
            cloudinary_id: result.public_id
        });

        await User.update(
            { isDeveloperProfileFiled: true },
            { where: { userId: user.userId } }
        );

        const developerWithUser = await Developer.findOne({
            where: { developerId: developer.developerId },
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
                        'profilePicture',
                        'isDeveloperProfileFiled'
                    ]
                }
            ]
        });

        logInfo('Developer profile created successfully', {
            developerId: developerWithUser.developerId,
            userId: user.userId
        });

        return {
            data: {
                developerId: developerWithUser.developerId,
                companyName: developerWithUser.companyName,
                cacRegNumber: developerWithUser.cacRegNumber,
                yearsInBusiness: developerWithUser.yearsInBusiness,
                projectsCompleted: developerWithUser.projectsCompleted,
                websiteUrl: developerWithUser.websiteUrl,
                officeAddress: developerWithUser.officeAddress,
                companyLogoUrl: developerWithUser.companyLogoUrl,
                isVerified: developerWithUser.isVerified,
                user: developerWithUser.user
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('DeveloperService',
            'createDeveloperProfile', e,
            'An error occurred while creating developer profile');
    }
};

exports.getDeveloperProfile = async (developerId) => {
    try {
        const { User, Developer } = getModels();

        const developer = await Developer.findByPk(developerId, {
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
                        'profilePicture']
                }
            ]
        });

        if (!developer) {
            return {
                error: "Developer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                developerId: developer.developerId,
                companyName: developer.companyName,
                cacRegNumber: developer.cacRegNumber,
                yearsInBusiness: developer.yearsInBusiness,
                projectsCompleted: developer.projectsCompleted,
                websiteUrl: developer.websiteUrl,
                officeAddress: developer.officeAddress,
                companyLogoUrl: developer.companyLogoUrl,
                isVerified: developer.isVerified,
                user: developer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving developer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getMyDeveloperProfile = async (userId) => {
    try {
        const { User, Developer } = getModels();

        const developer = await Developer.findOne({
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
                        'profilePicture'
                    ]
                }
            ]
        });

        if (!developer) {
            return {
                error: "Developer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                developerId: developer.developerId,
                companyName: developer.companyName,
                cacRegNumber: developer.cacRegNumber,
                yearsInBusiness: developer.yearsInBusiness,
                projectsCompleted: developer.projectsCompleted,
                websiteUrl: developer.websiteUrl,
                officeAddress: developer.officeAddress,
                companyLogoUrl: developer.companyLogoUrl,
                isVerified: developer.isVerified,
                user: developer.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving my developer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.getAllDevelopers = async (page = 1, limit = 10, search = '') => {
    try {
        const { User, Developer } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        if (search) {
            whereClause.companyName = {
                [require('sequelize').Op.iLike]: `%${search}%`
            };
        }

        const { rows: developers, count: totalDevelopers } = await Developer.findAndCountAll({
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
                        'profilePicture']
                }
            ],
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']]
        });

        const data = developers.map(developer => ({
            developerId: developer.developerId,
            companyName: developer.companyName,
            cacRegNumber: developer.cacRegNumber,
            yearsInBusiness: developer.yearsInBusiness,
            projectsCompleted: developer.projectsCompleted,
            websiteUrl: developer.websiteUrl,
            officeAddress: developer.officeAddress,
            companyLogoUrl: developer.companyLogoUrl,
            isVerified: developer.isVerified,
            user: developer.user
        }));

        return {
            data,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalDevelopers,
                totalPages: Math.ceil(totalDevelopers / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while fetching developers:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.verifyDeveloper = async (developerId, verified, user) => {
    try {
        const { Developer } = getModels();

        // Only admins can verify developers and super admin
        if (user.roleName !== "ADMIN" && user.roleName !== "SYSADMIN") {
            return {
                error: "Unauthorized to verify developers",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const developer = await Developer.findByPk(developerId);
        if (!developer) {
            return {
                error: "Developer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        await developer.update({ isVerified: verified });

        return {
            data: {
                developerId: developer.developerId,
                companyName: developer.companyName,
                isVerified: developer.isVerified,
                message: `Developer ${verified ? 'verified' : 'unverified'} successfully`
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while verifying developer:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.updateDeveloperProfile = async (developerId, body, file) => {
    try {
        const { User, Developer } = getModels();

        const developer = await Developer.findByPk(developerId);
        if (!developer) {
            return {
                error: "Developer profile not found",
                statusCode: StatusCodes.NOT_FOUND,
            };
        }

        let result;
        if (file && file.path) {
            result = await cloudinary.uploader.upload(file.path, {
                folder: "developers/logos",
                resource_type: "image",
            });
        }

        const update = {
            companyName: body.companyName?.trim() || developer.companyName,
            cacRegNumber: body.cacRegNumber?.trim() || developer.cacRegNumber,
            yearsInBusiness: body.yearsInBusiness
                ? parseInt(body.yearsInBusiness, 10)
                : developer.yearsInBusiness,
            projectsCompleted: body.projectsCompleted
                ? parseInt(body.projectsCompleted, 10)
                : developer.projectsCompleted,
            websiteUrl: body.websiteUrl?.trim() || developer.websiteUrl,
            officeAddress: body.officeAddress?.trim() || developer.officeAddress,
            companyLogoUrl: result?.secure_url || developer.companyLogoUrl,
            cloudinary_id: result?.public_id || developer.cloudinary_id,
        };


        await developer.update({ developerId }, update, {
            returning: true
        })

        const updatedDeveloper = await Developer.findByPk(developerId, {
            include: [
                {
                    model: User,
                    as: "user",
                    attributes: [
                        "userId",
                        "firstName",
                        "lastName",
                        "email",
                        "phoneNumber",
                        "profilePicture",
                    ],
                },
            ],
        });

        return {
            data: {
                developerId: updatedDeveloper.developerId,
                companyName: updatedDeveloper.companyName,
                cacRegNumber: updatedDeveloper.cacRegNumber,
                yearsInBusiness: updatedDeveloper.yearsInBusiness,
                projectsCompleted: updatedDeveloper.projectsCompleted,
                websiteUrl: updatedDeveloper.websiteUrl,
                officeAddress: updatedDeveloper.officeAddress,
                companyLogoUrl: updatedDeveloper.companyLogoUrl,
                isVerified: updatedDeveloper.isVerified,
                cloudinary_id: updatedDeveloper.cloudinary_id,
                user: updatedDeveloper.user,
            },
            statusCode: StatusCodes.OK,
        };
    } catch (e) {
        console.error("An error occurred while updating developer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        };
    }
};

exports.deleteDeveloperProfile = async (developerId, user) => {
    try {
        const { Developer } = getModels();

        const developer = await Developer.findByPk(developerId);
        if (!developer) {
            return {
                error: "Developer profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (
            developer.userId !== user.userId &&
            user.roleName !== "ADMIN" &&
            user.roleName !== "SYSADMIN"
        ) {
            return {
                error: "Unauthorized to delete this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        if (developer.cloudinary_id) {
            try {
                await cloudinary.uploader.destroy(developer.cloudinary_id);
                console.log(`✅ Cloudinary image deleted: ${developer.cloudinary_id}`);
            } catch (err) {
                console.error("⚠️ Failed to delete Cloudinary image:", err);
            }
        }

        await developer.destroy();

        return {
            data: {
                message: "Developer profile deleted successfully"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while deleting developer profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};