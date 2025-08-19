"use strict";
const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");
const Property = require("../models/PropertyModel");
const User = require("../models/UserModel");
const PropertyMedia = require("../models/PropertyMediaModel");
const Listing = require("../models/ListingModel");
const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");

exports.createProperty = async (body, files, userId) => {
    try {
        // Validate required fields
        if (!body.title || !body.description || !body.street || !body.city || !body.state) {
            return {
                error: "Missing required fields: title, description, street, city, state",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // Create property
        const property = await Property.create({
            ownerId: userId,
            title: body.title,
            description: body.description,
            street: body.street,
            city: body.city,
            state: body.state,
            country: body.country || 'NG',
            zipCode: body.zipCode,
            propertyType: body.propertyType,
            bedrooms: body.bedrooms,
            bathrooms: body.bathrooms,
            squareFootage: body.squareFootage,
            yearBuilt: body.yearBuilt,
            lotSize: body.lotSize,
            price: body.price,
            status: body.status || 'AVAILABLE'
        });

        // Handle media uploads if provided
        let mediaUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: "Alive/properties",
                        resource_type: "image",
                        height: 800,
                        width: 1200,
                        crop: "scale"
                    });

                    await PropertyMedia.create({
                        propertyId: property.propertyId,
                        mediaUrl: result.secure_url,
                        mediaType: 'IMAGE',
                        cloudinaryId: result.public_id,
                        isPrimary: mediaUrls.length === 0 
                    });

                    mediaUrls.push(result.secure_url);
                } catch (uploadError) {
                    logger.error("Error uploading media", { error: uploadError.message, propertyId: property.propertyId });
                }
            }
        }

        const propertyWithDetails = await Property.findByPk(property.propertyId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                {
                    model: PropertyMedia,
                    as: 'media',
                    attributes: ['mediaId', 'mediaUrl', 'mediaType', 'isPrimary']
                }
            ]
        });

        logInfo('Property created successfully', { 
            propertyId: property.propertyId,
            ownerId: userId,
            mediaCount: mediaUrls.length
        });

        return {
            data: {
                property: propertyWithDetails,
                mediaCount: mediaUrls.length
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'createProperty', e, 'Error creating property');
    }
};

exports.getPropertyById = async (propertyId, includeAssociations = true) => {
    try {
        const includeOptions = includeAssociations ? [
            {
                model: User,
                as: 'owner',
                attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber']
            },
            {
                model: PropertyMedia,
                as: 'media',
                attributes: ['mediaId', 'mediaUrl', 'mediaType', 'isPrimary', 'createdAt']
            },
            {
                model: Listing,
                as: 'listings',
                where: { listingStatus: 'ACTIVE' },
                required: false,
                attributes: ['listingId', 'listingPrice', 'listingStatus', 'listedDate']
            }
        ] : [];

        const property = await Property.findByPk(propertyId, {
            include: includeOptions
        });

        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        logInfo('Property retrieved successfully', { propertyId });
        
        return {
            data: property,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getPropertyById', e, 'Error fetching property');
        
    }
};

exports.getAllProperties = async (filters = {}, page = 1, limit = 10) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        
        if (filters.city) {
            whereClause.city = { [Op.iLike]: `%${filters.city}%` };
        }
        
        if (filters.state) {
            whereClause.state = { [Op.iLike]: `%${filters.state}%` };
        }
        
        if (filters.propertyType) {
            whereClause.propertyType = filters.propertyType;
        }
        
        if (filters.status) {
            whereClause.status = filters.status;
        }
        
        if (filters.minPrice || filters.maxPrice) {
            whereClause.price = {};
            if (filters.minPrice) whereClause.price[Op.gte] = parseFloat(filters.minPrice);
            if (filters.maxPrice) whereClause.price[Op.lte] = parseFloat(filters.maxPrice);
        }
        
        if (filters.minBedrooms) {
            whereClause.bedrooms = { [Op.gte]: parseInt(filters.minBedrooms) };
        }
        
        if (filters.maxBedrooms) {
            whereClause.bedrooms = { ...whereClause.bedrooms, [Op.lte]: parseInt(filters.maxBedrooms) };
        }

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName']
                },
                {
                    model: PropertyMedia,
                    as: 'media',
                    where: { isPrimary: true },
                    required: false,
                    attributes: ['mediaUrl']
                }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        });

        logInfo('Properties fetched successfully', { totalProperties, pageNumber, pageSize });
        
        return {
            data: properties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties,
                totalPages: Math.ceil(totalProperties / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getAllProperties', e, 'Error fetching properties');
    }
};

exports.getPropertiesByOwner = async (ownerId, page = 1, limit = 10) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: { ownerId },
            include: [
                {
                    model: PropertyMedia,
                    as: 'media',
                    where: { isPrimary: true },
                    required: false,
                    attributes: ['mediaUrl']
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: ['listingId', 'listingStatus', 'listingPrice']
                }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        });

        return {
            data: properties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties,
                totalPages: Math.ceil(totalProperties / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error fetching owner properties:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.updateProperty = async (propertyId, body, files, userId) => {
    try {
        const property = await Property.findByPk(propertyId);
        
        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check ownership
        if (property.ownerId !== userId) {
            return {
                error: "Unauthorized: You can only update your own properties",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        // Update property fields
        const updateData = {};
        const allowedFields = [
            'title', 'description', 'street', 'city', 'state', 'country', 
            'zipCode', 'propertyType', 'bedrooms', 'bathrooms', 'squareFootage',
            'yearBuilt', 'lotSize', 'price', 'status'
        ];

        allowedFields.forEach(field => {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        });

        await Property.update(updateData, { where: { propertyId } });

        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: "Alive/properties",
                        resource_type: "image",
                        height: 800,
                        width: 1200,
                        crop: "scale"
                    });

                    await PropertyMedia.create({
                        propertyId: property.propertyId,
                        mediaUrl: result.secure_url,
                        mediaType: 'IMAGE',
                        cloudinaryId: result.public_id,
                        isPrimary: false
                    });
                } catch (uploadError) {
                    console.error("Error uploading media:", uploadError);
                }
            }
        }

        // Fetch updated property
        const updatedProperty = await Property.findByPk(propertyId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName', 'email']
                },
                {
                    model: PropertyMedia,
                    as: 'media',
                    attributes: ['mediaId', 'mediaUrl', 'mediaType', 'isPrimary']
                }
            ]
        });

        return {
            data: updatedProperty,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error updating property:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.deleteProperty = async (propertyId, userId) => {
    try {
        const property = await Property.findByPk(propertyId);
        
        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        // Check ownership
        if (property.ownerId !== userId) {
            return {
                error: "Unauthorized: You can only delete your own properties",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        // Check if property has active listings
        const activeListings = await Listing.count({
            where: { 
                propertyId,
                listingStatus: { [Op.in]: ['ACTIVE', 'PENDING'] }
            }
        });

        if (activeListings > 0) {
            return {
                error: "Cannot delete property with active listings. Please withdraw or sell all listings first.",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // Delete associated media from cloudinary
        const mediaFiles = await PropertyMedia.findAll({
            where: { propertyId },
            attributes: ['cloudinaryId']
        });

        for (const media of mediaFiles) {
            if (media.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(media.cloudinaryId);
                } catch (cloudinaryError) {
                    console.error("Error deleting from cloudinary:", cloudinaryError);
                }
            }
        }

        // Delete property (cascades to media and listings)
        await Property.destroy({ where: { propertyId } });

        return {
            data: { propertyId },
            statusCode: StatusCodes.NO_CONTENT
        };

    } catch (e) {
        console.error("Error deleting property:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.searchProperties = async (searchTerm, filters = {}, page = 1, limit = 10) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {
            [Op.or]: [
                { title: { [Op.iLike]: `%${searchTerm}%` } },
                { description: { [Op.iLike]: `%${searchTerm}%` } },
                { city: { [Op.iLike]: `%${searchTerm}%` } },
                { state: { [Op.iLike]: `%${searchTerm}%` } },
                { street: { [Op.iLike]: `%${searchTerm}%` } }
            ]
        };

        // Add additional filters
        if (filters.propertyType) {
            whereClause.propertyType = filters.propertyType;
        }
        
        if (filters.minPrice || filters.maxPrice) {
            whereClause.price = {};
            if (filters.minPrice) whereClause.price[Op.gte] = parseFloat(filters.minPrice);
            if (filters.maxPrice) whereClause.price[Op.lte] = parseFloat(filters.maxPrice);
        }

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName']
                },
                {
                    model: PropertyMedia,
                    as: 'media',
                    where: { isPrimary: true },
                    required: false,
                    attributes: ['mediaUrl']
                }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        });

        return {
            data: properties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties,
                totalPages: Math.ceil(totalProperties / pageSize)
            },
            searchTerm,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error searching properties:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

exports.getPropertyStats = async (userId = null) => {
    try {
        const whereClause = userId ? { ownerId: userId } : {};

        const stats = await Property.findAll({
            where: whereClause,
            attributes: [
                'status',
                'propertyType',
                [Property.sequelize.fn('COUNT', Property.sequelize.col('propertyId')), 'count']
            ],
            group: ['status', 'propertyType'],
            raw: true
        });

        const totalProperties = await Property.count({ where: whereClause });
        const availableProperties = await Property.count({ 
            where: { ...whereClause, status: 'AVAILABLE' } 
        });

        return {
            data: {
                totalProperties,
                availableProperties,
                stats
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error("Error fetching property stats:", e);
        return {
            error: e.message,
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

