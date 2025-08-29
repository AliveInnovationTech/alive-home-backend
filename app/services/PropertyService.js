"use strict";
const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");
const sequelize = require("../../lib/database")
const cloudinary = require("../utils/cloudinary");
const logger = require("../utils/logger");
const { handleServiceError, logInfo } = require("../utils/errorHandler");
const{PROPERTY_TYPES, PROPERTY_STATUS, LISTING_STATUS} =require("../utils/constants")


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
            PROPERTY_TYPES.APARTMENT,
            PROPERTY_TYPES.HOUSE,
            PROPERTY_TYPES.VILLA,
            PROPERTY_TYPES.TOWNHOUSE,
            PROPERTY_TYPES.DETACHED_HOUSE,
            PROPERTY_TYPES.BOYS_QUARTERS,
            PROPERTY_TYPES.SEMI_DETACHED,
            PROPERTY_TYPES.TERRACE_HOUSE,
            PROPERTY_TYPES.DUPLEX,
            PROPERTY_TYPES.MANSION,
            PROPERTY_TYPES.ESTATE_HOUSE,
            PROPERTY_TYPES.BUNGALOW,
            PROPERTY_TYPES.PENTHOUSE,
            PROPERTY_TYPES.MINI_FLAT,
            PROPERTY_TYPES.CHALET,
            PROPERTY_TYPES.COMMERCIAL,
            PROPERTY_TYPES.LAND,
            PROPERTY_TYPES.COMMERCIAL_OFFICE,
            PROPERTY_TYPES.COMMERCIAL_PLAZA,
            PROPERTY_TYPES.RETAIL_SHOP,
            PROPERTY_TYPES.WAREHOUSE,
            PROPERTY_TYPES.HOTEL,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.ROOM_AND_PARLOUR,
            PROPERTY_TYPES.COMPOUND,
            PROPERTY_TYPES.STUDENT_HOSTEL,
            PROPERTY_TYPES.LAND_COMMERCIAL,
            PROPERTY_TYPES.LAND_INDUSTRIAL,
            PROPERTY_TYPES.LAND_AGRICULTURAL,
            PROPERTY_TYPES.SERVICED_APARTMENT,
            PROPERTY_TYPES.SELF_CONTAINED,
            PROPERTY_TYPES.LAND_RESIDENTIAL,
            PROPERTY_TYPES.CONDO,
            PROPERTY_TYPES.MULTIFAMILY,
            PROPERTY_TYPES.SINGLE_FAMILY

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
            PROPERTY_STATUS.ACTIVE,
            PROPERTY_STATUS.PENDING,
            PROPERTY_STATUS.DRAFT,
            PROPERTY_STATUS.SOLD,
            PROPERTY_STATUS.UNAVAILABLE,
            PROPERTY_STATUS.AVAILABLE
        ];
        let status = body.status || PROPERTY_STATUS.AVAILABLE;
        if (!validStatuses.includes(status)) {
            status = PROPERTY_STATUS.AVAILABLE;
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

        if (body.status === PROPERTY_STATUS.AVAILABLE) {
            await Listing.create({
                propertyId: property.propertyId,
                listedBy: user.userId,
                listerRole: userRole,
                listingPrice: body.price,
                originalPrice: body.price,
                marketingDescription: body.marketingDescription || body.description,
                listingStatus: LISTING_STATUS.ACTIVE,
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

    const { Property, PropertyMedia, Listing, User } = getModels();
    try {
        const includeOptions = [
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
                ],
                include: [
                    {
                        model: User,
                        as: 'lister',
                        attributes: ['userId', 'firstName', 'lastName']
                    }
                ]
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


exports.getAllProperties = async (filters = {}, page = 1, limit = 20) => {
    try {
        const { Property, PropertyMedia, Listing, User } = getModels();

        const pageNumber = Math.max(parseInt(page, 10), 1);
        const pageSize = Math.max(parseInt(limit, 10), 1);
        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {};
        const listingWhereClause = {};

        if (filters.search || filters.searchTerm || filters.q) {
            let rawSearch = filters.searchTerm || filters.q || "";
            
            if (Array.isArray(rawSearch)) {
                rawSearch = rawSearch[0] || "";
            }
            
            const searchTerm = String(rawSearch).trim();
            if (searchTerm !== "") {
                whereClause[Op.or] = [
                    { title: { [Op.iLike]: `%${searchTerm}%` } },
                    { description: { [Op.iLike]: `%${searchTerm}%` } },
                    { city: { [Op.iLike]: `%${searchTerm}%` } },
                    { state: { [Op.iLike]: `%${searchTerm}%` } },
                    { address: { [Op.iLike]: `%${searchTerm}%` } }
                ];
            }
        }

        if (filters.city && !filters.search && !filters.searchTerm && !filters.q) {
            whereClause.city = { [Op.iLike]: `%${filters.city}%` };
        }
        if (filters.state && !filters.search && !filters.searchTerm && !filters.q) {
            whereClause.state = { [Op.iLike]: `%${filters.state}%` };
        }

        if (filters.propertyType) {
            whereClause.propertyType = filters.propertyType;
        }

        if (filters.status) {
            whereClause.status = filters.status;
        }

        const minPrice = filters.minPrice || filters.miniPrice;
        const maxPrice = filters.maxPrice;

        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) {
                const minPriceNum = parseFloat(minPrice);
                if (!isNaN(minPriceNum)) {
                    whereClause.price[Op.gte] = minPriceNum;
                }
            }
            if (maxPrice) {
                const maxPriceNum = parseFloat(maxPrice);
                if (!isNaN(maxPriceNum)) {
                    whereClause.price[Op.lte] = maxPriceNum;
                }
            }
        }

        if (filters.bedrooms) {
            const bedroomsNum = parseInt(filters.bedrooms, 10);
            if (!isNaN(bedroomsNum)) {
                whereClause.bedrooms = bedroomsNum;
            }
        } else {
            if (filters.minBedrooms) {
                const minBedroomsNum = parseInt(filters.minBedrooms, 10);
                if (!isNaN(minBedroomsNum)) {
                    whereClause.bedrooms = { [Op.gte]: minBedroomsNum };
                }
            }
            if (filters.maxBedrooms) {
                const maxBedroomsNum = parseInt(filters.maxBedrooms, 10);
                if (!isNaN(maxBedroomsNum)) {
                    whereClause.bedrooms = {
                        ...whereClause.bedrooms,
                        [Op.lte]: maxBedroomsNum
                    };
                }
            }
        }

        // BATHROOM FILTERS (FIXED: Added NaN validation and exact match support)
        if (filters.bathrooms) {
            const bathroomsNum = parseFloat(filters.bathrooms);
            if (!isNaN(bathroomsNum)) {
                whereClause.bathrooms = bathroomsNum;
            }
        } else {
            if (filters.minBathrooms) {
                const minBathroomsNum = parseFloat(filters.minBathrooms);
                if (!isNaN(minBathroomsNum)) {
                    whereClause.bathrooms = { [Op.gte]: minBathroomsNum };
                }
            }
            if (filters.maxBathrooms) {
                const maxBathroomsNum = parseFloat(filters.maxBathrooms);
                if (!isNaN(maxBathroomsNum)) {
                    whereClause.bathrooms = {
                        ...whereClause.bathrooms,
                        [Op.lte]: maxBathroomsNum
                    };
                }
            }
        }

        if (filters.minSquareFeet || filters.maxSquareFeet) {
            whereClause.squareFeet = {};
            if (filters.minSquareFeet) {
                const minSqFt = parseFloat(filters.minSquareFeet);
                if (!isNaN(minSqFt)) {
                    whereClause.squareFeet[Op.gte] = minSqFt;
                }
            }
            if (filters.maxSquareFeet) {
                const maxSqFt = parseFloat(filters.maxSquareFeet);
                if (!isNaN(maxSqFt)) {
                    whereClause.squareFeet[Op.lte] = maxSqFt;
                }
            }
        }

        if (filters.minLotSize || filters.maxLotSize) {
            whereClause.lotSize = {};
            if (filters.minLotSize) {
                const minLot = parseFloat(filters.minLotSize);
                if (!isNaN(minLot)) {
                    whereClause.lotSize[Op.gte] = minLot;
                }
            }
            if (filters.maxLotSize) {
                const maxLot = parseFloat(filters.maxLotSize);
                if (!isNaN(maxLot)) {
                    whereClause.lotSize[Op.lte] = maxLot;
                }
            }
        }

        if (filters.minYearBuilt || filters.maxYearBuilt) {
            whereClause.yearBuilt = {};
            if (filters.minYearBuilt) {
                const minYear = parseInt(filters.minYearBuilt, 10);
                if (!isNaN(minYear)) {
                    whereClause.yearBuilt[Op.gte] = minYear;
                }
            }
            if (filters.maxYearBuilt) {
                const maxYear = parseInt(filters.maxYearBuilt, 10);
                if (!isNaN(maxYear)) {
                    whereClause.yearBuilt[Op.lte] = maxYear;
                }
            }
        }

        if (filters.zipCode) {
            whereClause.zipCode = { [Op.iLike]: `%${filters.zipCode}%` };
        }

        if (filters.features) {
            const featuresArray = Array.isArray(filters.features)
                ? filters.features
                : filters.features.split(',').map(f => f.trim());

            whereClause.features = {
                [Op.contains]: featuresArray
            };
        }

        if (filters.latitude && filters.longitude && filters.radius) {
        }

        if (filters.listedAfter) {
            whereClause.createdAt = { [Op.gte]: new Date(filters.listedAfter) };
        }
        if (filters.listedBefore) {
            whereClause.createdAt = {
                ...whereClause.createdAt,
                [Op.lte]: new Date(filters.listedBefore)
            };
        }

        if (filters.listerRole) {
            listingWhereClause.listerRole = filters.listerRole;
        }
        if (filters.listingStatus) {
            listingWhereClause.listingStatus = filters.listingStatus;
        }

        if (filters.minListingPrice || filters.maxListingPrice) {
            listingWhereClause.listingPrice = {};
            if (filters.minListingPrice) {
                const minListingPrice = parseFloat(filters.minListingPrice);
                if (!isNaN(minListingPrice)) {
                    listingWhereClause.listingPrice[Op.gte] = minListingPrice;
                }
            }
            if (filters.maxListingPrice) {
                const maxListingPrice = parseFloat(filters.maxListingPrice);
                if (!isNaN(maxListingPrice)) {
                    listingWhereClause.listingPrice[Op.lte] = maxListingPrice;
                }
            }
        }

        if (filters.mlsNumber) {
            listingWhereClause.mlsNumber = { [Op.iLike]: `%${filters.mlsNumber}%` };
        }
        if (filters.mlsStatus) {
            listingWhereClause.mlsStatus = { [Op.iLike]: `%${filters.mlsStatus}%` };
        }

        if (filters.isOpenHouse !== undefined) {
            listingWhereClause.isOpenHouse = filters.isOpenHouse === 'true';
        }

        if (filters.hasVirtualTour === 'true') {
            listingWhereClause.virtualTourUrl = { [Op.ne]: null };
        }

        if (filters.listedAfter || filters.listedBefore) {
            listingWhereClause.listedDate = {};
            if (filters.listedAfter) listingWhereClause.listedDate[Op.gte] = new Date(filters.listedAfter);
            if (filters.listedBefore) listingWhereClause.listedDate[Op.lte] = new Date(filters.listedBefore);
        }

        let orderBy = [["createdAt", "DESC"]];

        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'price_asc':
                    orderBy = [["price", "ASC"]];
                    break;
                case 'price_desc':
                    orderBy = [["price", "DESC"]];
                    break;
                case 'listing_price_asc':
                    orderBy = [[{ model: Listing, as: 'listings' }, "listingPrice", "ASC"]];
                    break;
                case 'listing_price_desc':
                    orderBy = [[{ model: Listing, as: 'listings' }, "listingPrice", "DESC"]];
                    break;
                case 'newest':
                    orderBy = [["createdAt", "DESC"]];
                    break;
                case 'oldest':
                    orderBy = [["createdAt", "ASC"]];
                    break;
                case 'recently_listed':
                    orderBy = [[{ model: Listing, as: 'listings' }, "listedDate", "DESC"]];
                    break;
                case 'bedrooms_desc':
                    orderBy = [["bedrooms", "DESC"]];
                    break;
                case 'bedrooms_asc':
                    orderBy = [["bedrooms", "ASC"]];
                    break;
                case 'bathrooms_desc':
                    orderBy = [["bathrooms", "DESC"]];
                    break;
                case 'bathrooms_asc':
                    orderBy = [["bathrooms", "ASC"]];
                    break;
                case 'square_feet_desc':
                    orderBy = [["squareFeet", "DESC"]];
                    break;
                case 'square_feet_asc':
                    orderBy = [["squareFeet", "ASC"]];
                    break;
                case 'year_built_desc':
                    orderBy = [["yearBuilt", "DESC"]];
                    break;
                case 'year_built_asc':
                    orderBy = [["yearBuilt", "ASC"]];
                    break;
                case 'lot_size_desc':
                    orderBy = [["lotSize", "DESC"]];
                    break;
                case 'lot_size_asc':
                    orderBy = [["lotSize", "ASC"]];
                    break;
                case 'most_viewed':
                    orderBy = [[{ model: Listing, as: 'listings' }, "viewCount", "DESC"]];
                    break;
                case 'most_inquired':
                    orderBy = [[{ model: Listing, as: 'listings' }, "inquiryCount", "DESC"]];
                    break;
                case 'most_favorited':
                    orderBy = [[{ model: Listing, as: 'listings' }, "favoriteCount", "DESC"]];
                    break;
                default:
                    orderBy = [["createdAt", "DESC"]];
            }
        }

        const queryOptions = {
            where: whereClause,
            order: orderBy,
            offset,
            limit: pageSize,
            include: [
                {
                    model: PropertyMedia,
                    as: "media",
                    attributes: [
                        "mediaId",
                        "cloudinaryUrl",
                        "mediaType",
                        "isMainImage",
                        "isFeatured",
                        "displayOrder",
                        "ImageTitle",
                        "description",
                        "altText",
                        "width",
                        "height",
                        "duration"
                    ],
                    where: {
                        isActive: true,
                        isProcessed: true
                    },
                    order: [['displayOrder', 'ASC'], ['isMainImage', 'DESC']],
                    required: false
                },
                {
                    model: Listing,
                    as: 'listings',
                    attributes: [
                        'listingId',
                        'listingStatus',
                        'listingPrice',
                        'originalPrice',
                        'listedBy',
                        'listedDate',
                        'marketingDescription',
                        'virtualTourUrl',
                        'isOpenHouse',
                        'openHouseSchedule',
                        'viewCount',
                        'inquiryCount',
                        'favoriteCount',
                        'mlsNumber',
                        'mlsStatus',
                        'commissionRate',
                        'soldDate',
                        'expirationDate'
                    ],
                    where: Object.keys(listingWhereClause).length > 0 ? listingWhereClause : undefined,
                    required: Object.keys(listingWhereClause).length > 0,
                    include: [
                        {
                            model: User,
                            as: 'lister',
                            attributes: ['userId', 'firstName', 'lastName', 'email', 'phoneNumber']
                        }
                    ]
                }
            ],
        };

        const { rows: properties, count: totalProperties } = await Property.findAndCountAll(queryOptions);

        let filteredProperties = properties;

        if (filters.latitude && filters.longitude && filters.radius) {
            const geoProperties = await Property.findWithinRadius(
                parseFloat(filters.latitude),
                parseFloat(filters.longitude),
                parseFloat(filters.radius) || 10
            );

            const geoPropertyIds = geoProperties.map(p => p.propertyId);
            filteredProperties = properties.filter(property =>
                geoPropertyIds.includes(property.propertyId)
            );
        }

        if (filters.directOwnerOnly === "true") {
            filteredProperties = filteredProperties.filter(property =>
                property.listings && property.listings.some(listing =>
                    listing.listedBy === property.ownerId
                )
            );
        }

        if (filters.hasImages === 'true') {
            filteredProperties = filteredProperties.filter(property =>
                property.media && property.media.length > 0
            );
        }

        if (filters.hasVirtualTour === 'true') {
            filteredProperties = filteredProperties.filter(property =>
                property.listings && property.listings.some(listing =>
                    listing.virtualTourUrl
                )
            );
        }

        const response = {
            data: filteredProperties,
            pagination: {
                currentPage: pageNumber,
                pageSize,
                totalProperties: filters.directOwnerOnly === "true" ? filteredProperties.length : totalProperties,
                totalPages: Math.ceil(
                    (filters.directOwnerOnly === "true" ? filteredProperties.length : totalProperties) / pageSize
                ),
            },
            statusCode: StatusCodes.OK
        };

        // Include search term in response if it was provided (for search functionality)
        if (filters.search || filters.searchTerm || filters.q) {
            response.searchTerm = filters.searchTerm || filters.q;
        }

        // Include applied filters summary (Enhanced with all available filters)
        response.appliedFilters = {
            hasSearch: !!(filters.searchTerm || filters.q),
            hasLocationFilter: !!(filters.city || filters.state || filters.zipCode),
            hasPriceFilter: !!(minPrice || maxPrice),
            hasListingPriceFilter: !!(filters.minListingPrice || filters.maxListingPrice),
            hasBedroomFilter: !!(filters.bedrooms || filters.minBedrooms || filters.maxBedrooms),
            hasBathroomFilter: !!(filters.bathrooms || filters.minBathrooms || filters.maxBathrooms),
            hasSquareFeetFilter: !!(filters.minSquareFeet || filters.maxSquareFeet),
            hasLotSizeFilter: !!(filters.minLotSize || filters.maxLotSize),
            hasYearBuiltFilter: !!(filters.minYearBuilt || filters.maxYearBuilt),
            hasDateFilter: !!(filters.listedAfter || filters.listedBefore),
            hasFeaturesFilter: !!filters.features,
            hasGeoFilter: !!(filters.latitude && filters.longitude && filters.radius),
            hasMLSFilter: !!(filters.mlsNumber || filters.mlsStatus),
            hasMediaFilter: !!(filters.hasImages || filters.hasVirtualTour),
            propertyType: filters.propertyType,
            status: filters.status,
            listingStatus: filters.listingStatus,
            sortBy: filters.sortBy || 'newest'
        };

        return {
            data: response,
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        console.error('PropertyService getAllProperties error:', e);
        return handleServiceError("PropertyService", "getAllProperties", e, "Error fetching/searching properties");
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
            statusCode: StatusCodes.OK
        };

    } catch (e) {
        return handleServiceError('PropertyService', 'deleteProperty', e, 'Error deleting property');
    }
};

exports.deleteAllProperties = async (user) => {
    try {
        const { Listing, Property, PropertyMedia } = getModels();

        if (!user || user.roleName !== "SYSADMIN") {
            return {
                error: "Unauthorized: Only sysadmins can perform this action",
                statusCode: StatusCodes.FORBIDDEN
            };
        }

        const properties = await Property.findAll({ attributes: ["propertyId"] });

        if (properties.length === 0) {
            return {
                message: "No properties found to delete",
                statusCode: StatusCodes.OK
            };
        }

        const propertyIds = properties.map(p => p.propertyId);

        const mediaFiles = await PropertyMedia.findAll({
            where: { propertyId: { [Op.in]: propertyIds } },
            attributes: ["cloudinaryId"]
        });

        // ✅ Delete Cloudinary files
        for (const media of mediaFiles) {
            if (media.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(media.cloudinaryId);
                } catch (cloudinaryError) {
                    logger.error("Error deleting from Cloudinary:", cloudinaryError);
                }
            }
        }

        await Listing.destroy({ where: { propertyId: { [Op.in]: propertyIds } } });
        await PropertyMedia.destroy({ where: { propertyId: { [Op.in]: propertyIds } } });
        await Property.destroy({ where: { propertyId: { [Op.in]: propertyIds } } });

        return {
            data: {
                message: `Successfully deleted ${properties.length} properties and related data`,
                statusCode: StatusCodes.OK
            }
        };

    } catch (e) {
        return handleServiceError(
            "PropertyService",
            "deleteAllProperties",
            e,
            "Error deleting all properties"
        );
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
            listingStatus: body.listingStatus || LISTING_STATUS.ACTIVE,
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

exports.updatePropertyListingStatus = async (propertyId, listingStatus, soldDate, userId) => {
    try {
        const { Property, Listing } = getModels();

        if (!propertyId || !listingStatus || !userId) {
            return {
                error: "Missing required parameters: propertyId, listingStatus, userId",
                statusCode: StatusCodes.BAD_REQUEST,
            };
        }

        const property = await Property.findByPk(propertyId);
        if (!property) {
            return {
                error: "Property not found",
                statusCode: StatusCodes.NOT_FOUND,
            };
        }

        const listing = await Listing.findOne({
            where: { propertyId, listedBy: userId },
        });

        if (!listing) {
            return {
                error: "Listing not found for this property and user",
                statusCode: StatusCodes.NOT_FOUND,
            };
        }

        if (listingStatus === "SOLD" && !soldDate) {
            return {
                error: "soldDate is required when marking a listing as SOLD",
                statusCode: StatusCodes.BAD_REQUEST,
            };
        }

        const allowedStatuses = [
            LISTING_STATUS.DRAFT,
            LISTING_STATUS.ACTIVE,
            LISTING_STATUS.PENDING,
            LISTING_STATUS.SOLD,
            LISTING_STATUS.WITHDRAWN,
            LISTING_STATUS.EXPIRED
        ];
        if (!allowedStatuses.includes(listingStatus)) {
            return {
                error: `Invalid listingStatus. Allowed values: ${allowedStatuses.join(", ")}`,
                statusCode: StatusCodes.BAD_REQUEST,
            };
        }

        listing.listingStatus = listingStatus;
        if (listingStatus === LISTING_STATUS.SOLD) {
            listing.soldDate = soldDate || new Date();
        }
        await listing.save();
        return {
            data: listing,
            statusCode: StatusCodes.OK,
        };
    } catch (e) {
        return handleServiceError(
            "PropertyService",
            "updatePropertyListingStatus",
            e,
            "Error updating property listing status"
        );
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
        const validStatuses = [
            PROPERTY_STATUS.ACTIVE,
            PROPERTY_STATUS.PENDING,
            PROPERTY_STATUS.DRAFT,
            PROPERTY_STATUS.SOLD,
            PROPERTY_STATUS.UNAVAILABLE
        ];
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