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

exports.createProperty = async (body, files, user, userRole) => {
    try {
        const { Property, PropertyMedia, Listing, User } = getModels();
        const requiredFields = [
            "title",
            "address",
            "city",
            "state",
            "zipCode",
            "propertyType",
            "bedrooms",
            "bathrooms",
            "latitude",
            "longitude",
            "price"
        ];

        const missingFields = requiredFields.filter(f => !body[f] && body[f] !== 0);
        if (missingFields.length > 0) {
            return {
                error: `Missing required fields: ${missingFields.join(", ")}`,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const validPropertyTypes = [
            "SINGLE_FAMILY",
            "MULTI_FAMILY",
            "CONDO",
            "APARTMENT",
            "COMMERCIAL",
            "LAND",
            "VILLA",
            "TOWNHOUSE"
        ];
        if (!validPropertyTypes.includes(body.propertyType)) {
            return {
                error: `Invalid propertyType. Must be one of: ${validPropertyTypes.join(", ")}`,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const ownerExists = await User.findByPk(user.userId);
        if (!ownerExists) {
            return {
                error: "User not found. Cannot create property for non-existent owner.",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const validStatuses = [
            "active",
            "pending",
            "draft",
            "sold",
            "unavailable",
            "AVAILABLE",
            "SOLD",
            "PENDING",
            "DRAFT"
        ];
        let status = body.status || "AVAILABLE";
        if (!validStatuses.includes(status)) {
            status = "AVAILABLE";
        }
        const numericFields = {
            bedrooms: { value: body.bedrooms, min: 0 },
            bathrooms: { value: body.bathrooms, min: 0.5 },
            squareFeet: { value: body.squareFeet, min: 0, optional: true },
            yearBuilt: { value: body.yearBuilt, min: 1800, optional: true },
            lotSize: { value: body.lotSize, min: 0, optional: true },
            price: { value: body.price, min: 0 }
        };

        for (const [field, config] of Object.entries(numericFields)) {
            if (config.value === undefined || config.value === null) {
                if (!config.optional) {
                    return {
                        error: `${field} is required`,
                        statusCode: StatusCodes.BAD_REQUEST
                    };
                }
                continue;
            }

            const numericValue = parseFloat(String(config.value).replace(/[^0-9.]/g, ''));

            if (isNaN(numericValue)) {
                return {
                    error: `${field} must be a valid number`,
                    statusCode: StatusCodes.BAD_REQUEST
                };
            }

            if (numericValue < config.min) {
                return {
                    error: `${field} must be at least ${config.min}`,
                    statusCode: StatusCodes.BAD_REQUEST
                };
            }

            body[field] = numericValue;
        }

        const latitude = parseFloat(body.latitude);
        const longitude = parseFloat(body.longitude);

        if (isNaN(latitude) || latitude < -90 || latitude > 90) {
            return {
                error: 'Latitude must be a valid number between -90 and 90',
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        if (isNaN(longitude) || longitude < -180 || longitude > 180) {
            return {
                error: 'Longitude must be a valid number between -180 and 180',
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        const property = await Property.create({
            ownerId: user.userId,
            title: body.title,
            description: body.description,
            address: body.address,
            city: body.city,
            state: body.state,
            country: body.country || "NG",
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
            status,
            features: body.features || []
        });

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
                        mediaType: "IMAGE",
                        cloudinaryId: result.public_id,
                        isMainImage: mediaUrls.length === 0,
                        fileName: file.originalname || "House",
                        originalName: file.originalname || "house",
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        uploadedBy: user.userId
                    });

                    mediaUrls.push(result.secure_url);
                } catch (uploadError) {
                    logger.error("Error uploading media", {
                        error: uploadError.message,
                        propertyId: property.propertyId
                    });
                }
            }
        }

        if (body.createListing !== false) {
            await Listing.create({
                propertyId: property.propertyId,
                listedBy: user.userId,
                listerRole: userRole,
                listingPrice: body.price,
                originalPrice: body.price,
                marketingDescription: body.marketingDescription || body.description,
                listingStatus: "ACTIVE"
            });
        }

        const propertyWithDetails = await Property.findByPk(property.propertyId);

        logInfo("Property created successfully", {
            propertyId: property.propertyId,
            ownerId: user.userId,
            userRole: userRole,
            mediaCount: mediaUrls.length
        });

        return {
            data: {
                property: propertyWithDetails,
                mediaCount: mediaUrls.length,
                userRole
            },
            statusCode: StatusCodes.CREATED
        };

    } catch (e) {
        console.error("🔥 Sequelize Error Details:", e.name, e.message, e.errors);

        if (e.name === 'SequelizeForeignKeyConstraintError') {
            return {
                error: "Invalid user reference. The specified owner does not exist.",
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        if (e.name === 'SequelizeValidationError') {
            const validationErrors = e.errors.map(err => ({
                field: err.path,
                message: err.message
            }));
            return {
                error: "Validation failed",
                details: validationErrors,
                statusCode: StatusCodes.BAD_REQUEST
            };
        }

        return handleServiceError("PropertyService", "createProperty", e, "Error creating property");
    }
};

exports.getPropertyById = async (propertyId) => {

    const { Property, PropertyMedia, Listing } = getModels();
    try {
        const includeOptions = [
            {
                model: PropertyMedia,
                as: 'media',
                attributes: ['mediaId', 'cloudinaryUrl', 'mediaType', 'isMainImage']
            },
            {
                model: Listing,
                as: "listings",
            }
        ];

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
                    attributes: ['mediaId', 'cloudinaryUrl', 'mediaType', 'isMainImage']
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: [
                        'listingId',
                        'listingStatus',
                        'listingPrice',
                        'listedBy'
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


exports.getAllProperties = async (filters = {}, page = 1, limit = 10) => {
    try {
        const { Property, PropertyMedia, Listing, User } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        const listingWhereClause = {};

        // Property filters
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

        // Listing filters
        if (filters.listerRole) {
            listingWhereClause.listerRole = filters.listerRole;
        }

        // Price filters
        if (filters.minPrice || filters.maxPrice) {
            whereClause.price = {};
            if (filters.minPrice) whereClause.price[Op.gte] = parseFloat(filters.minPrice);
            if (filters.maxPrice) whereClause.price[Op.lte] = parseFloat(filters.maxPrice);
        }

        // Bedrooms filters
        if (filters.minBedrooms) {
            whereClause.bedrooms = { [Op.gte]: parseInt(filters.minBedrooms) };
        }
        if (filters.maxBedrooms) {
            whereClause.bedrooms = {
                ...whereClause.bedrooms,
                [Op.lte]: parseInt(filters.maxBedrooms)
            };
        }

        // Query options
        const queryOptions = {
            where: whereClause,
            order: [["createdAt", "DESC"]],
            offset,
            limit: pageSize,
            include: [
                {
                    model: PropertyMedia,
                    as: "media",
                    attributes: ["mediaId", "cloudinaryUrl", "mediaType", "isMainImage"],
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: [
                        'listingId',
                        'listingStatus',
                        'listingPrice',
                        'listedBy'
                    ],
                    include: [
                        {
                            model: User,
                            as: 'lister',
                            attributes: ['userId', 'firstName', 'lastName']
                        }
                    ]
                }
            ],
        };

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll(queryOptions);

        let filteredProperties = properties;
        if (filters.directOwnerOnly === "true") {
            filteredProperties = properties.filter(property =>
                property.listings && property.listings.some(listing =>
                    listing.listedBy === property.ownerId
                )
            );
        }

        return {
            data: filteredProperties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties: filters.directOwnerOnly === "true" ? filteredProperties.length : totalProperties,
                totalPages: Math.ceil(
                    (filters.directOwnerOnly === "true" ? filteredProperties.length : totalProperties) / pageSize
                ),
            },
            statusCode: StatusCodes.OK,
        };

    } catch (e) {
        return handleServiceError("PropertyService", "getAllProperties", e, "Error fetching properties");
    }
};

exports.getPropertiesByOwner = async (ownerId, page = 1, limit = 10) => {
    try {
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const pageSize = Math.max(parseInt(limit, 10) || 10, 1);
        const offset = (pageNumber - 1) * pageSize;

        const { Listing, Property, PropertyMedia, User } = getModels();

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll({
            where: { ownerId },
            include: [
                {
                    model: PropertyMedia,
                    as: 'media',
                    where: { isMainImage: true },
                    required: false,
                    attributes: ['cloudinaryUrl']
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: [
                        'listingId',
                        'listingStatus',
                        'listingPrice',
                        'listedBy'
                    ],
                    include: [
                        {
                            model: User,
                            as: 'lister',
                            attributes: ['userId', 'firstName', 'lastName']
                        }
                    ]
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
        return handleServiceError(
            'PropertyService',
            'getPropertiesByOwner',
            e,
            'Error fetching owner properties'
        );
    }
};

exports.searchProperties = async (searchTerm = "", filters = {}, page = 1, limit = 10) => {
    try {
        const { Property } = getModels();

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

        if (filters.miniPrice || filters.maxPrice) {
            const priceFilter = {};
            if (!isNaN(parseFloat(filters.miniPrice))) {
                priceFilter[Op.gte] = parseFloat(filters.miniPrice);
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


//TODO: TESTING OF THE FOLLOWING ENDPOINTS LATER

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
        const { Listing, Property, PropertyMedia } = getModels();

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



exports.getPropertyStats = async (userId = null) => {
    try {
        const { Property, Listing } = getModels();

        const whereClause = userId ? { ownerId: userId } : {};

        const stats = await Property.findAll({
            where: whereClause,
            attributes: [
                'status',
                'propertyType',
                [Property.sequelize.fn('COUNT', Property.sequelize.col('*')), 'count']
            ],
            group: ['status', 'propertyType'],
            raw: true
        });

        // Listing stats grouped by listingStatus
        const listingStats = await Listing.findAll({
            attributes: [
                'listingStatus',
                [Listing.sequelize.fn('COUNT', Property.sequelize.col('*')), 'count']
            ],
            group: ['listingStatus'],
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
                listingStats
            },
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'getPropertyStats', e, 'Error fetching property stats');
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

        if (property.ownerId !== userId && !['ADMIN',
            'SYSADMIN',
            'REALTOR',
            'DEVELOPER',
            'HOMEOWNER'
        ].includes(userId.role)) {
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