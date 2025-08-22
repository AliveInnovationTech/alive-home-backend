"use strict";
const { StatusCodes } = require("http-status-codes");
const sequelize = require("../../lib/database");
const realtorValidator = require("../validators/RealtorValidator");
const cloudinary = require("../utils/cloudinary");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const { Op, Sequelize } = require("sequelize");

// Wait for models to be loaded
const getModels = () => {
    if (!sequelize.models.User
        || !sequelize.models.Realtor
        || !sequelize.models.Transaction
        || !sequelize.models.Property) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Realtor: sequelize.models.Realtor,
        Transaction: sequelize.models.Transaction,
        Property: sequelize.models.Property
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

        // 🔍 Search across user fields + Realtor fields
        if (search) {
            whereClause[Op.or] = [
                Sequelize.where(Sequelize.col("user.firstName"), { [Op.iLike]: `%${search}%` }),
                Sequelize.where(Sequelize.col("user.lastName"), { [Op.iLike]: `%${search}%` }),
                Sequelize.where(Sequelize.col("user.email"), { [Op.iLike]: `%${search}%` }),
                { brokerageName: { [Op.iLike]: `%${search}%` } },
                { licenseNumber: { [Op.iLike]: `%${search}%` } } // ✅ included
            ];
        }

        // 🎯 Filter by specialty (array contains)
        if (specialty) {
            whereClause.specialties = {
                [Op.contains]: [specialty]
            };
        }

        // ✅ Filter by verification status
        if (isVerified !== '') {
            whereClause.isVerified = isVerified === 'true';
        }

        // 📦 Query DB with pagination
        const { rows: realtors, count: totalRealtors } = await Realtor.findAndCountAll({
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
                        'profilePicture'
                    ]
                }
            ],
            offset,
            limit: pageSize,
            order: [['createdAt', 'DESC']]
        });

        // 📤 Format response
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
        if (realtor.userId !== user.userId && user.roleName !== "ADMIN" && user.roleName !== "SYSADMIN") {
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
        if (user.roleName !== 'ADMIN' && user.roleName !== 'SYSADMIN') {
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
        const { Realtor } = getModels();

        const realtor = await Realtor.findByPk(realtorId);
        if (!realtor) {
            return {
                error: "Realtor profile not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check if user owns this profile or is admin
        if (realtor.userId !== user.userId && user.roleName !== 'ADMIN' && user.roleName !== 'SYSADMIN') {
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

        await realtor.update({
            verificationDocsUrls: updatedUrls,
            cloudinary_ids: uploadedUrls.map(url => url.public_id)
        });

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

exports.calculateRealtorStats = async(realtorId, user)=> {
    const { User, Realtor, Transaction, Property } = getModels();

    const realtor = await Realtor.findByPk(realtorId);
    if (!realtor) {
        return { error: "Realtor profile not found", statusCode: StatusCodes.NOT_FOUND };
    }

    // --- Step 1: Get all properties for this realtor ---
    const properties = await Property.findAll({ where: { realtorId } });
    const propertyIds = properties.map(p => p.id);

    // --- Step 2: Get all transactions for those properties ---
    let transactions = [];
    if (propertyIds.length > 0) {
        transactions = await Transaction.findAll({
            where: { propertyId: propertyIds }
        });
    }

    // --- Step 3: Calculate stats ---
    const totalPropertiesSold = transactions.length;
    const totalSalesValue = transactions.reduce((sum, t) => sum + (t.salePrice || 0), 0);

    const averageDaysOnMarket =
        totalPropertiesSold > 0
            ? transactions.reduce((sum, t) => {
                const daysOnMarket = Math.max(
                    0,
                    (new Date(t.soldAt) - new Date(t.listedAt)) / (1000 * 60 * 60 * 24)
                );
                return sum + daysOnMarket;
            }, 0) / totalPropertiesSold
            : 0;

    const clientReviews = await User.findAll({
        where: { reviewedRealtorId: realtorId },
        attributes: ["rating"]
    });
    const clientSatisfactionScore = clientReviews.length > 0
        ? clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length
        : null;

    const currentListings = await Property.count({
        where: { realtorId, status: "active" }
    });

    const monthlyCommission = transactions.reduce((sum, t) => {
        const saleDate = new Date(t.soldAt);
        const now = new Date();
        if (
            saleDate.getMonth() === now.getMonth() &&
            saleDate.getFullYear() === now.getFullYear()
        ) {
            sum += (t.commission || 0);
        }
        return sum;
    }, 0);

    const fullStats = {
        totalPropertiesSold,
        totalSalesValue,
        averageDaysOnMarket: Math.round(averageDaysOnMarket),
        clientSatisfactionScore,
        currentListings,
        monthlyCommission
    };

    // --- Step 4: Role-based filtering ---
    let stats;
    if (user.roleName === "SYSADMIN") {
        stats = fullStats;
    } else if (user.roleName === "ADMIN") {
        stats = fullStats;
    } else if (user.roleName === "REALTOR") {
        if (user.realtorId !== realtorId) {
            return { error: "Unauthorized", statusCode: StatusCodes.FORBIDDEN };
        }
        stats = fullStats;
    } else if (user.roleName === "BUYER") {
        stats = {
            totalPropertiesSold: fullStats.totalPropertiesSold,
            averageDaysOnMarket: fullStats.averageDaysOnMarket,
            clientSatisfactionScore: fullStats.clientSatisfactionScore,
            currentListings: fullStats.currentListings
        };
    } else {
        return { error: "Unauthorized role", statusCode: StatusCodes.FORBIDDEN };
    }

    return {
        data: {
            realtorId: realtor.realtorId,
            licenseNumber: realtor.licenseNumber,
            brokerageName: realtor.brokerageName,
            yearsOfExperience: realtor.yearsOfExperience,
            stats
        },
        statusCode: StatusCodes.OK
    };
}
