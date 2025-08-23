const { Op } = require('sequelize');
const cloudinary = require("../utils/cloudinary")
const fs = require('fs').promises;
const sequelize = require("../../lib/database")




const getModels = () => {
    if (!sequelize.models.PropertyMedia || !sequelize.models.Property || !sequelize.models.User) {
        throw new Error('Models not loaded yet');
    }
    return {
        PropertyMedia: sequelize.models.PropertyMedia,
        Property: sequelize.models.Property,
        User: sequelize.models.User
    };
};

exports.createMedia = async (mediaData, transaction = null) => {
    try {
        const { PropertyMedia } = getModels();
        const media = await PropertyMedia.create(mediaData, {
            transaction,
            include: [
                { model: Property, as: 'property' },
                { model: User, as: 'uploader' }
            ]
        });

        return await this.getMediaById(media.mediaId);
    } catch (error) {
        throw new Error(`Failed to create property media: ${error.message}`);
    }
}


exports.uploadMultipleMedia = async (files, propertyId, uploadedBy, transaction = null) => {
    const uploadedMedia = [];

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const cloudinaryResult = await cloudinary.uploader.upload(file.path, {
                folder: `properties/${propertyId}`,
                resource_type: 'auto',
                transformation: file.mimetype.startsWith('image/') ? [
                    { width: 1920, height: 1080, crop: 'limit', quality: 'auto' }
                ] : undefined
            });

            let mediaType = 'IMAGE';
            if (file.mimetype.startsWith('video/')) {
                mediaType = 'VIDEO';
            }

            // Create media record
            const mediaData = {
                propertyId,
                mediaType,
                fileName: file.filename,
                fileSize: file.size,
                mimeType: file.mimetype,
                originalName: file.originalname,
                cloudinaryId: cloudinaryResult.public_id,
                cloudinaryUrl: cloudinaryResult.secure_url,
                width: cloudinaryResult.width,
                height: cloudinaryResult.height,
                duration: cloudinaryResult.duration,
                displayOrder: i,
                uploadedBy,
                isProcessed: true
            };

            const media = await this.createMedia(mediaData, transaction);
            uploadedMedia.push(media);

            // Clean up temporary file
            try {
                await fs.unlink(file.path);
            } catch (unlinkError) {
                console.warn(`Failed to delete temp file: ${file.path}`);
            }
        }

        return uploadedMedia;
    } catch (error) {
        for (const media of uploadedMedia) {
            try {
                await cloudinary.uploader.destroy(media.cloudinaryId);
            } catch (cleanupError) {
                console.error('Failed to cleanup cloudinary file:', cleanupError);
            }
        }
        throw new Error(`Failed to upload media: ${error.message}`);
    }
}


exports.getMediaById = async (mediaId) => {
    try {
        const { PropertyMedia, Property, User } = getModels();
        const media = await PropertyMedia.findByPk(mediaId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: ['propertyId', 'title', 'slug']
                },
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                }
            ]
        });

        if (!media) {
            throw new Error('Media not found');
        }

        return media;
    } catch (error) {
        throw new Error(`Failed to get media: ${error.message}`);
    }
}

    /**
     * Get all media for a property
     * @param {String} propertyId - Property ID
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Media list with pagination
     */
    exports.getMediaByProperty = async (propertyId, options = {}) => {
        const {
            mediaType = null,
            isActive = true,
            isFeatured = null,
            page = 1,
        limit = 20,
        sortBy = 'displayOrder',
        sortOrder = 'ASC'
    } = options;

    try {
        const where = { propertyId };

        if (mediaType) where.mediaType = mediaType;
        if (isActive !== null) where.isActive = isActive;
        if (isFeatured !== null) where.isFeatured = isFeatured;

        const offset = (page - 1) * limit;

        const { count, rows } = await PropertyMedia.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'uploader',
                    attributes: ['userId', 'firstName', 'lastName']
                }
            ],
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            media: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    } catch (error) {
        throw new Error(`Failed to get property media: ${error.message}`);
    }
}


exports.updateMedia = async (mediaId, updateData) => {
    try {
        const media = await PropertyMedia.findByPk(mediaId);
        if (!media) {
            throw new Error('Media not found');
        }

        await media.update(updateData);
        return await this.getMediaById(mediaId);
    } catch (error) {
        throw new Error(`Failed to update media: ${error.message}`);
    }
}


exports.setMainImage = async (mediaId, propertyId) => {
    try {


        const { PropertyMedia } = getModels();


        await PropertyMedia.update(
            { isMainImage: false },
            { where: { propertyId, isMainImage: true } }
        );

        // Set new main image
        const media = await PropertyMedia.findByPk(mediaId);
        if (!media) {
            throw new Error('Media not found');
        }

        if (media.propertyId !== propertyId) {
            throw new Error('Media does not belong to this property');
        }

        if (media.mediaType !== 'IMAGE') {
            throw new Error('Only images can be set as main image');
        }

        await media.update({ isMainImage: true });
        return await this.getMediaById(mediaId);
    } catch (error) {
        throw new Error(`Failed to set main image: ${error.message}`);
    }
}


exports.updateDisplayOrder = async (mediaOrder) => {
    try {
        const updatedMedia = [];

        for (const item of mediaOrder) {
            const media = await PropertyMedia.findByPk(item.mediaId);
            if (media) {
                await media.update({ displayOrder: item.displayOrder });
                updatedMedia.push(await this.getMediaById(item.mediaId));
            }
        }

        return updatedMedia;
    } catch (error) {
        throw new Error(`Failed to update display order: ${error.message}`);
    }
}

/**
 * Delete media
 * @param {String} mediaId - Media ID
 * @returns {Promise<Boolean>} Success status
 */
exports.deleteMedia = async (mediaId) => {

    const { PropertyMedia } = getModels();
    try {
        const media = await PropertyMedia.findByPk(mediaId);
        if (!media) {
            throw new Error('Media not found');
        }

        // Delete from Cloudinary
        try {
            await cloudinary.uploader.destroy(media.cloudinaryId);
        } catch (cloudinaryError) {
            console.error('Failed to delete from Cloudinary:', cloudinaryError);
            // Continue with database deletion even if cloudinary fails
        }

        // Soft delete from database (paranoid: true)
        await media.destroy();
        return true;
    } catch (error) {
        throw new Error(`Failed to delete media: ${error.message}`);
    }
}

/**
 * Get media statistics for a property
 * @param {String} propertyId - Property ID
 * @returns {Promise<Object>} Media statistics
 */
exports.getMediaStats = async (propertyId) => {
    const { PropertyMedia } = getModels();
    try {
        const stats = await PropertyMedia.findAll({
            where: { propertyId },
            attributes: [
                'mediaType',
                [PropertyMedia.sequelize.fn('COUNT', PropertyMedia.sequelize.col('mediaId')), 'count'],
                [PropertyMedia.sequelize.fn('SUM', PropertyMedia.sequelize.col('fileSize')), 'totalSize']
            ],
            group: ['mediaType'],
            raw: true
        });

        const mainImage = await PropertyMedia.findOne({
            where: { propertyId, isMainImage: true },
            attributes: ['mediaId', 'cloudinaryUrl', 'title']
        });

        return {
            breakdown: stats,
            mainImage,
            totalFiles: stats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
            totalSize: stats.reduce((sum, stat) => sum + parseInt(stat.totalSize || 0), 0)
        };
    } catch (error) {
        throw new Error(`Failed to get media statistics: ${error.message}`);
    }
}

/**
 * Search media across properties
 * @param {Object} searchOptions - Search parameters
 * @returns {Promise<Object>} Search results with pagination
 */
exports.searchMedia = async (searchOptions = {}) => {
    const {
        query,
        mediaType,
        propertyId,
        uploadedBy,
        isActive = true,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
    } = searchOptions;
    const { PropertyMedia, Property, User } = getModels();
    try {
        const where = {};
        const include = [
            {
                model: Property,
                as: 'property',
                attributes: ['propertyId', 'title', 'slug']
            },
            {
                model: User,
                as: 'uploader',
                attributes: ['userId', 'firstName', 'lastName']
            }
        ];

        if (query) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } },
                { originalName: { [Op.iLike]: `%${query}%` } }
            ];
        }

        if (mediaType) where.mediaType = mediaType;
        if (propertyId) where.propertyId = propertyId;
        if (uploadedBy) where.uploadedBy = uploadedBy;
        if (isActive !== null) where.isActive = isActive;

        const offset = (page - 1) * limit;

        const { count, rows } = await PropertyMedia.findAndCountAll({
            where,
            include,
            order: [[sortBy, sortOrder]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return {
            media: rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        };
    } catch (error) {
        throw new Error(`Failed to search media: ${error.message}`);
    }
}

