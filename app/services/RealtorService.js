"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const realtorValidator = require("../validators/RealtorValidator");
const cloudinary = require("../utils/cloudinary");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const { Op, Sequelize } = require("sequelize");

// Wait for models to be loaded
const getModels = () => {
    if (!sequelize.models.User || !sequelize.models.Realtor) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Realtor: sequelize.models.Realtor
    };
};

exports.createRealtorProfile = async (payload, user) => {
    try {
        const validatorError = await realtorValidator.createRealtorProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Realtor } = getModels();

        // Check if user already has a realtor profile
        const existingRealtor = await Realtor.findOne({
            where: { userId: user.userId }
        });

        if (existingRealtor) {
            return {
                error: "User already has a realtor profile",
                statusCode: StatusCodes.CONFLICT
            };
        }

        const realtor = await Realtor.create({
            userId: user.userId,
            licenseNumber: payload.licenseNumber,
            brokerageName: payload.brokerageName,
            yearsOfExperience: payload.yearsOfExperience,
            specialties: payload.specialties || [],
            certifications: payload.certifications || [],
            verificationDocsUrls: payload.verificationDocsUrls || [],
            isVerified: false
        });

        await User.update(
            { isRealtorProfileFiled: true },
            { where: { userId: user.userId } }
        );


        const realtorWithUser = await Realtor.findOne({
            where: { realtorId: realtor.realtorId },
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
                        'isRealtorProfileFiled'
                    ]
                }
            ]
        });

        logInfo('Realtor profile created successfully', { realtorId: realtorWithUser.realtorId, userId: user.userId });

        return {
            data: {
                realtorId: realtorWithUser.realtorId,
                licenseNumber: realtorWithUser.licenseNumber,
                brokerageName: realtorWithUser.brokerageName,
                yearsOfExperience: realtorWithUser.yearsOfExperience,
                specialties: realtorWithUser.specialties,
                certifications: realtorWithUser.certifications,
                verificationDocsUrls: realtorWithUser.verificationDocsUrls,
                isVerified: realtorWithUser.isVerified,
                user: realtorWithUser.user
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('RealtorService', 'createRealtorProfile', e, 'An error occurred while creating realtor profile');
    }
};

exports.getRealtorProfile = async (realtorId) => {
    try {
        const { User, Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId, {
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

        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                realtorId: realtor.realtorId,
                licenseNumber: realtor.licenseNumber,
                brokerageName: realtor.brokerageName,
                yearsOfExperience: realtor.yearsOfExperience,
                specialties: realtor.specialties,
                certifications: realtor.certifications,
                verificationDocsUrls: realtor.verificationDocsUrls,
                isVerified: realtor.isVerified,
                user: realtor.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving realtor profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getMyRealtorProfile = async (userId) => {
    try {
        const { User, Realtor } = getModels();

        const realtor = await Realtor.findOne({
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

        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                realtorId: realtor.realtorId,
                licenseNumber: realtor.licenseNumber,
                brokerageName: realtor.brokerageName,
                yearsOfExperience: realtor.yearsOfExperience,
                specialties: realtor.specialties,
                certifications: realtor.certifications,
                verificationDocsUrls: realtor.verificationDocsUrls,
                isVerified: realtor.isVerified,
                user: realtor.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving my realtor profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.updateRealtorProfile = async (realtorId, payload, user) => {
    try {
        const validatorError = await realtorValidator.updateRealtorProfile(payload);
        if (validatorError) {
            return {
                error: validatorError,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { User, Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (realtor.userId !== user.userId && user.role !== "ADMIN" && user.role !== "SYSADMIN") {
            return {
                error: "Unauthorized to update this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const updateData = {};
        const allowedFields = [
            'brokerageName', 'yearsOfExperience', 'specialties',
            'certifications',
        ];

        allowedFields.forEach(field => {
            if (payload[field] !== undefined) {
                updateData[field] = payload[field];
            }
        });

        await realtor.update(updateData);

        const updatedRealtor = await Realtor.findByPk(realtorId, {
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

        return {
            data: {
                realtorId: updatedRealtor.realtorId,
                licenseNumber: updatedRealtor.licenseNumber,
                brokerageName: updatedRealtor.brokerageName,
                yearsOfExperience: updatedRealtor.yearsOfExperience,
                specialties: updatedRealtor.specialties,
                certifications: updatedRealtor.certifications,
                verificationDocsUrls: updatedRealtor.verificationDocsUrls,
                isVerified: updatedRealtor.isVerified,
                user: updatedRealtor.user
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while updating realtor profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getAllRealtors = async (page = 1, limit = 10, search = '', specialty = '', isVerified = '') => {
    try {
        const { User, Realtor } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};

        // Specialty filter
        if (specialty) {
            whereClause.specialties = { [Op.contains]: [specialty] };
        }

        // Verification filter
        if (isVerified !== '') {
            whereClause.isVerified = isVerified === 'true';
        }

        // Build include for user
        const include = [
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
                ],
            }
        ];

        // Search by user fields or brokerageName
        if (search) {
            whereClause[Op.or] = [
                Sequelize.where(Sequelize.col("user.firstName"), { [Op.iLike]: `%${search}%` }),
                Sequelize.where(Sequelize.col("user.lastName"), { [Op.iLike]: `%${search}%` }),
                Sequelize.where(Sequelize.col("user.email"), { [Op.iLike]: `%${search}%` }),
                { brokerageName: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows: realtors, count: totalRealtors } = await Realtor.findAndCountAll({
            where: whereClause,
            include,
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']]
        });

        const data = realtors.map(realtor => ({
            realtorId: realtor.realtorId,
            licenseNumber: realtor.licenseNumber,
            brokerageName: realtor.brokerageName,
            yearsOfExperience: realtor.yearsOfExperience,
            specialties: realtor.specialties,
            certifications: realtor.certifications,
            verificationDocsUrls: realtor.verificationDocsUrls,
            isVerified: realtor.isVerified,
            user: realtor.user
        }));

        return {
            data,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalRealtors,
                totalPages: Math.ceil(totalRealtors / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while fetching realtors:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.deleteRealtorProfile = async (realtorId, user) => {
    try {
        const { User, Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin or is not super admin
        if (realtor.userId !== user.userId && user.role !== "ADMIN" && user.role !== "SYSADMIN") {
            return {
                error: "Unauthorized to delete this profile",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        await realtor.destroy();

        return {
            data: {
                message: "Realtor profile deleted successfully"
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while deleting realtor profile:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.verifyRealtor = async (realtorId, verified, user) => {
    try {
        const { User, Realtor } = getModels();

        // Only admins can verify realtors
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            return {
                error: "Unauthorized to verify realtors",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        await realtor.update({ isVerified: verified });

        return {
            data: {
                realtorId: realtor.realtorId,
                licenseNumber: realtor.licenseNumber,
                brokerageName: realtor.brokerageName,
                isVerified: realtor.isVerified,
                message: `Realtor ${verified ? 'verified' : 'unverified'} successfully`
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while verifying realtor:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};


exports.uploadVerificationDocuments = async (realtorId, files, user) => {
    try {
        const {Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (realtor.userId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
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

        const uploadedUrls = [];
        for (const file of files) {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "Alive/realtor_verification_docs"
            });
            uploadedUrls.push(result.secure_url && result.public_id);
        }
        const updatedUrls = [...(realtor.verificationDocsUrls || []), ...uploadedUrls];

        await realtor.update({ verificationDocsUrls: updatedUrls, cloudinary_id: uploadedUrls });

        return {
            data: {
                realtorId: realtor.realtorId,
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

exports.getRealtorStats = async (realtorId) => {
    try {
        const { User, Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // This is a placeholder for realtor statistics
        // In a real implementation, you would calculate actual stats from transactions
        const mockStats = {
            totalPropertiesSold: 25,
            totalSalesValue: 15000000,
            averageDaysOnMarket: 45,
            clientSatisfactionScore: 4.8,
            currentListings: 8,
            monthlyCommission: 250000
        };

        return {
            data: {
                realtorId: realtor.realtorId,
                licenseNumber: realtor.licenseNumber,
                brokerageName: realtor.brokerageName,
                yearsOfExperience: realtor.yearsOfExperience,
                stats: mockStats
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("An error occurred while retrieving realtor stats:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};
