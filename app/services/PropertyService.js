"use strict";
const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");
const sequelize = require("../../lib/database")
const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");



const getModels = () => {
    if (!sequelize.models.Property || !sequelize.models.PropertyMedia
        || !sequelize.models.Listing || !sequelize.models.User) {
        throw new Error('Models not loaded yet');
    }
    return {
        User: sequelize.models.User,
        Property: sequelize.models.Property,
        PropertyMedia: sequelize.models.PropertyMedia,
        Listing: sequelize.models.Listing
    };
};

exports.createProperty = async (body, files, userId, userRole) => {
    try {
        if (!body.title || !body.description || !body.address || !body.city || !body.state) {
            return {
                error: "Missing required fields: title, description, address, city, state",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        // const validRoles = ["DEVELOPER", "HOMEOWNER", "REALTOR"];
        // if (!validRoles.includes(userRole)) {
        //     return {
        //         error: "Invalid user role. Must be DEVELOPER, HOMEOWNER, or REALTOR",
        //         statusCode: StatusCodes.BAD_REQUEST
        //     };
        // }

        const { Property, PropertyMedia, User, Listing } = getModels();

        const property = await Property.create({
            ownerId: userId,
            title: body.title,
            description: body.description,
            address: body.address,
            city: body.city,
            state: body.state,
            country: body.country || 'NG',
            zipCode: body.zipCode,
            propertyType: body.propertyType,
            bedrooms: body.bedrooms,
            bathrooms: body.bathrooms,
            squareFeet: body.squareFeet,
            yearBuilt: body.yearBuilt,
            lotSize: body.lotSize,
            latitude: body.latitude,
            longitude: body.longitude,
            price: body.price,
            status: body.status || 'AVAILABLE',
            features: body.features || []
        });

        let cloudinaryUrl = [];
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
                        cloudinaryUrl: result.secure_url,
                        mediaType: 'IMAGE',
                        cloudinaryId: result.public_id,
                        isMainImage: mediaUrls.length === 0,
                        fileName: "House",
                        originalName: "house"

                    });

                    mediaUrls.push(result.secure_url);
                } catch (uploadError) {
                    logger.error("Error uploading media", { error: uploadError.message, propertyId: property.propertyId });
                }
            }
        }

        if (body.createListing !== false) {
            await Listing.create({
                propertyId: property.propertyId,
                listedBy: userId,
                listerRole: userRole,
                listingPrice: body.price,
                originalPrice: body.price,
                marketingDescription: body.marketingDescription || body.description,
                listingStatus: 'ACTIVE'
            });
        }

        // For now, let's return the basic property to avoid association issues
        const propertyWithDetails = await Property.findByPk(property.propertyId);

        logInfo('Property created successfully', {
            propertyId: property.propertyId,
            ownerId: userId,
            userRole: userRole,
            mediaCount: cloudinaryUrl.length
        });

        return {
            data: {
                property: propertyWithDetails,
                mediaCount: cloudinaryUrl.length,
                userRole: userRole
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'createProperty', e, 'Error creating property');
    }
};

exports.createListing = async (propertyId, body, userId, userRole) => {
    try {
        const { Property, Listing, User } = getModels();

        const property = await Property.findByPk(propertyId);
        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const listing = await Listing.create({
            propertyId: propertyId,
            listedBy: userId,
            listerRole: userRole,
            listingPrice: body.listingPrice,
            originalPrice: body.originalPrice || body.listingPrice,
            marketingDescription: body.marketingDescription,
            listingStatus: body.listingStatus || 'ACTIVE',
            virtualTourUrl: body.virtualTourUrl || null,
            isOpenHouse: body.isOpenHouse || false,
            openHouseSchedule: body.openHouseSchedule || []
        });

        const listingWithDetails = await Listing.findByPk(listing.listingId, {
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [{
                        model: User,
                        as: 'owner',
                        attributes: ['userId', 'firstName', 'lastName']
                    }]
                },
                {
                    model: User,
                    as: 'lister',
                    attributes: ['userId', 'firstName', 'lastName', 'role']
                }
            ]
        });

        return {
            data: listingWithDetails,
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        return handleServiceError(
            'PropertyService',
            'createListing',
            e,
            'Error creating listing');
    }
};

exports.getPropertyById = async (propertyId, includeAssociations = true) => {

    const { Listing, Property, PropertyMedia, User } = getModels();
    try {
        const includeOptions = [];

        const property = await Property.findByPk(propertyId, {
            include: includeOptions
        });

        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const listingInsights = {
            isDirectOwnerListing: false,
            hasRealtorListing: false,
            listingTypes: []
        };

        if (property.listings && property.listings.length > 0) {
            property.listings.forEach(listing => {

                if (listing.listedBy === property.ownerId) {
                    listingInsights.isDirectOwnerListing = true;
                }
                if (listing.listerRole === 'REALTOR') {
                    listingInsights.hasRealtorListing = true;
                }
                listingInsights.listingTypes.push(listing.listerRole);
            });
        }

        logInfo('Property retrieved successfully', {
            propertyId,
            listingCount: property.listings?.length || 0
        });

        return {
            data: {
                ...property.toJSON(),
                listingInsights
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getPropertyById', e, 'Error fetching property');
    }
};


exports.getAllProperties = async (filters = {}, page = 1, limit = 10) => {
    try {
        const { Property, PropertyMedia, User, Listing } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        const listingWhereClause = {};

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

        if (filters.listerRole) {
            listingWhereClause.listerRole = filters.listerRole;
        }

        if (filters.directOwnerOnly === 'true') {
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

        const queryOptions = {
            where: whereClause,
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        };

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll(queryOptions);
        let filteredProperties = properties;
        if (filters.directOwnerOnly === 'true') {
            filteredProperties = properties.filter(property => {
                return property.listings && property.listings.some(listing =>
                    listing.listedBy === property.ownerId
                );
            });
        }

        return {
            data: filteredProperties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties: filters.directOwnerOnly === 'true' ? filteredProperties.length : totalProperties,
                totalPages: Math.ceil((filters.directOwnerOnly === 'true' ? filteredProperties.length : totalProperties) / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getAllProperties', e, 'Error fetching properties');
    }
};

exports.getListingsByRole = async (role, page = 1, limit = 10) => {
    try {
        const validRoles = ['DEVELOPER', 'HOMEOWNER', 'REALTOR'];
        if (!validRoles.includes(role)) {
            return {
                error: "Invalid role",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const { Listing, Property, User, PropertyMedia } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const { rows: listings, count: totalListings } = await Listing.findAndCountAll({
            where: {
                listerRole: role,
                listingStatus: 'ACTIVE'
            },
            include: [
                {
                    model: Property,
                    as: 'property',
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
                    ]
                },
                {
                    model: User,
                    as: 'lister',
                    attributes: ['userId', 'firstName', 'lastName', 'role']
                }
            ],
            order: [['listedDate', 'DESC']],
            offset,
            limit: pageSize
        });

        return {
            data: {
                listings,
                role: role
            },
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalListings,
                totalPages: Math.ceil(totalListings / pageSize)
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getListingsByRole', e, 'Error fetching listings by role');
    }
};


exports.getPropertiesByOwner = async (ownerId, page = 1, limit = 10) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const { Listing, Property, PropertyMedia, User } = getModels();

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
                    attributes: [
                        'listingId', 'listingStatus', 'listingPrice',
                        'listerRole', 'listedBy'
                    ],
                    include: [{
                        model: User,
                        as: 'lister',
                        attributes: ['userId', 'firstName', 'lastName']
                    }]
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
        return handleServiceError('PropertyService', 'getPropertiesByOwner', e, 'Error fetching owner properties');
    }
};

exports.updateProperty = async (propertyId, body, files, userId) => {
    try {
        const { Property, PropertyMedia, User } = getModels();

        const property = await Property.findByPk(propertyId);

        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }


        if (property.ownerId !== userId) {
            return {
                error: "Unauthorized: You can only update your own properties",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const updateData = {};
        const allowedFields = [
            'title', 'description', 'address', 'city', 'state', 'country',
            'zipCode', 'propertyType', 'bedrooms', 'bathrooms', 'squareFeet',
            'yearBuilt', 'lotSize', 'price', 'status', 'latitude', 'longitude', 'features'
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
                        isMainImage: false
                    });
                } catch (uploadError) {
                    logger.error("Error uploading media:", uploadError);
                }
            }
        }

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
                    attributes: ['mediaId', 'mediaUrl', 'mediaType', 'isMainImage']
                }
            ]
        });

        return {
            data: updatedProperty,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'updateProperty', e, 'Error updating property');
    }
};

exports.deleteProperty = async (propertyId, userId) => {
    try {
        const { Listing, Property, PropertyMedia, User } = getModels();

        const property = await Property.findByPk(propertyId);

        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (property.ownerId !== userId) {
            return {
                error: "Unauthorized: You can only delete your own properties",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

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

        const mediaFiles = await PropertyMedia.findAll({
            where: { propertyId },
            attributes: ['cloudinaryId']
        });

        for (const media of mediaFiles) {
            if (media.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(media.cloudinaryId);
                } catch (cloudinaryError) {
                    logger.error("Error deleting from cloudinary:", cloudinaryError);
                }
            }
        }

        await Property.destroy({ where: { propertyId } });

        return {
            data: { propertyId },
            statusCode: StatusCodes.NO_CONTENT
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'deleteProperty', e, 'Error deleting property');
    }
};

exports.searchProperties = async (searchTerm = "", filters = {}, page = 1, limit = 10) => {
    try {
        const { Listing, Property, PropertyMedia, User } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};

        if (searchTerm && searchTerm.trim() !== "") {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${searchTerm}%` } },
                { description: { [Op.iLike]: `%${searchTerm}%` } },
                { city: { [Op.iLike]: `%${searchTerm}%` } },
                { state: { [Op.iLike]: `%${searchTerm}%` } },
                { address: { [Op.iLike]: `%${searchTerm}%` } }
            ];
        }

        if (filters.propertyType) {
            whereClause.propertyType = filters.propertyType;
        }

        if (filters.minPrice || filters.maxPrice) {
            const priceFilter = {};
            if (!isNaN(parseFloat(filters.minPrice))) {
                priceFilter[Op.gte] = parseFloat(filters.minPrice);
            }
            if (!isNaN(parseFloat(filters.maxPrice))) {
                priceFilter[Op.lte] = parseFloat(filters.maxPrice);
            }
            if (Object.keys(priceFilter).length > 0) {
                whereClause.price = priceFilter;
            }
        }

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        });

        return {
            data: {
                properties,
                pagination: {
                    currentPage: pageNumber,
                    pageSize,
                    totalProperties,
                    totalPages: Math.ceil(totalProperties / pageSize)
                },
                searchTerm
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'searchProperties', e, 'Error searching properties');
    }
};

exports.getPropertyStats = async (userId = null) => {
    try {
        const { Property, Listing } = getModels();

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

        const listingStats = await Listing.findAll({
            attributes: [
                'listerRole',
                'listingStatus',
                [Listing.sequelize.fn('COUNT', Listing.sequelize.col('listingId')), 'count']
            ],
            group: ['listerRole', 'listingStatus'],
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
                propertyStats: stats,
                listingStats: listingStats
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getPropertyStats', e, 'Error fetching property stats');
    }
};

exports.getPropertiesByUser = async (userId, page = 1, limit = 10) => {
    try {
        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * pageSize;

        const { Property, PropertyMedia, User, Listing } = getModels();

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: { ownerId: userId },
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName', 'email', 'role']
                },
                {
                    model: PropertyMedia,
                    as: 'media',
                    attributes: ['mediaId', 'mediaUrl', 'mediaType', 'isMainImage']
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: [
                        'listingId', 'listingStatus', 'listingPrice',
                        'listerRole', 'listedBy'
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit: pageSize
        });

        if (!properties.length) {
            return {
                error: 'No properties found for this user',
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        return {
            data: {
                properties,
                pagination: {
                    currentPage: pageNumber,
                    pageSize,
                    totalProperties,
                    totalPages: Math.ceil(totalProperties / pageSize)
                }
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError(
            'PropertyService',
            'getPropertiesByUser',
            e,
            'Error fetching properties by user');
    }
};

exports.updatePropertyStatus = async (propertyId, status, userId) => {
    try {
        const validStatuses = ['active', 'pending', 'draft', 'sold', 'unavailable', 'AVAILABLE', 'SOLD', 'PENDING', 'DRAFT'];
        if (!validStatuses.includes(status)) {
            return {
                error: 'Invalid status. Must be one of: active, pending, draft, sold, unavailable',
                statusCode: StatusCodes.BAD_REQUEST
            };
        }
        const { Property, User } = getModels();

        const property = await Property.findByPk(propertyId, {
            include: [
                {
                    model: User,
                    as: 'owner',
                    attributes: ['userId', 'firstName', 'lastName']
                }
            ]
        });

        if (!property) {
            return {
                error: 'Property not found',
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        if (property.ownerId !== userId && !['ADMIN', 'SYSADMIN'].includes(userId.role)) {
            return {
                error: 'Unauthorized to update this property',
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        await property.update({ status });

        logInfo('Property status updated', {
            propertyId,
            oldStatus: property.status,
            newStatus: status,
            updatedBy: userId
        });

        return {
            data: {
                property,
                message: `Property status updated to ${status}`
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'updatePropertyStatus', e, 'Error updating property status');
    }
};