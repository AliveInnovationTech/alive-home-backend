"use strict";
const { StatusCodes } = require("http-status-codes");
const { Op } = require("sequelize");
const {GoogleGenAI} = require ("@google/genai")
const sequelize = require('../../lib/database');
const { Property, UserBehavior, Recommendation, User, Listing, PropertyMedia } = sequelize.models;
const logger = require('../utils/logger');

// OpenAI API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.MODEL || 'gemini-2.0-flash'
const GEMINI_MAX_TOKENS = parseInt(process.env.GEMINI_MAX_TOKENS) || 10000
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE) || 2;

// Initialize OpenAI client
const gemini = new GoogleGenAI({ apiKey:GEMINI_API_KEY });

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const calculateProximityScore = (distance) => {
    if (distance <= 5) return 1.0; // Within 5km
    if (distance <= 10) return 0.8; // Within 10km
    if (distance <= 20) return 0.6; // Within 20km
    if (distance <= 50) return 0.4; // Within 50km
    return 0.2;
};


const analyzeUserBehavior = async (userId) => {
    try {
        const behaviors = await UserBehavior.findAll({
            where: { userId },
            include: [
                {
                    model: Property,
                    as: 'property',
                    attributes: [
                        'propertyId',
                        'title',
                        'propertyType',
                        'bedrooms',
                        'bathrooms',
                        'price',
                        'city',
                        'state'
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        const preferences = {
            propertyTypes: {},
            priceRange: { min: Infinity, max: 0 },
            bedrooms: {},
            bathrooms: {},
            locations: {},
            searchQueries: [],
            interactionScores: {}
        };

        behaviors.forEach(behavior => {
            const daysSince = (new Date() - new Date(behavior.createdAt)) / (1000 * 60 * 60 * 24);
            const timeDecay = Math.exp(-daysSince / 30);

            const interactionScore = behavior.interactionScore || 1;
            const weight = timeDecay * interactionScore;

            if (behavior.searchQuery) {
                preferences.searchQueries.push(behavior.searchQuery);
            }

            if (behavior.searchFilters) {
                const filters = behavior.searchFilters;
                if (filters.propertyType) {
                    preferences.propertyTypes[filters.propertyType] = (preferences.propertyTypes[filters.propertyType] || 0) + weight;
                }
                if (filters.minPrice) {
                    preferences.priceRange.min = Math.min(preferences.priceRange.min, filters.minPrice);
                }
                if (filters.maxPrice) {
                    preferences.priceRange.max = Math.max(preferences.priceRange.max, filters.maxPrice);
                }
                if (filters.bedrooms) {
                    preferences.bedrooms[filters.bedrooms] = (preferences.bedrooms[filters.bedrooms] || 0) + weight;
                }
                if (filters.bathrooms) {
                    preferences.bathrooms[filters.bathrooms] = (preferences.bathrooms[filters.bathrooms] || 0) + weight;
                }
            }

            // Analyze search locations
            if (behavior.searchLocation) {
                preferences.locations[behavior.searchLocation] =
                    (preferences.locations[behavior.searchLocation] || 0) + weight;
            }

            // Analyze property interactions
            if (behavior.property) {
                const property = behavior.property;
                preferences.propertyTypes[property.propertyType] = (preferences.propertyTypes[property.propertyType] || 0) + weight;
                preferences.bedrooms[property.bedrooms] = (preferences.bedrooms[property.bedrooms] || 0) + weight;
                preferences.bathrooms[property.bathrooms] = (preferences.bathrooms[property.bathrooms] || 0) + weight;
                preferences.locations[`${property.city}, ${property.state}`] = (preferences.locations[`${property.city}, ${property.state}`] || 0) + weight;

                // Calculate interaction scores based on behavior type
                const score = behavior.behaviorType === 'PROPERTY_FAVORITE' ? 3 :
                    behavior.behaviorType === 'SCHEDULE_VIEWING' ? 2 :
                        behavior.behaviorType === 'CONTACT_AGENT' ? 2 :
                            behavior.behaviorType === 'PROPERTY_VIEW' ? 1 : 0.5;

                preferences.interactionScores[property.propertyId] = (preferences.interactionScores[property.propertyId] || 0) + score * weight;
            }
        });

        // Get top preferences
        const topPropertyTypes = Object.entries(preferences.propertyTypes)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([type]) => type);

        const topLocations = Object.entries(preferences.locations)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([location]) => location);

        const topBedrooms = Object.entries(preferences.bedrooms)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([bedrooms]) => parseInt(bedrooms));

        const topBathrooms = Object.entries(preferences.bathrooms)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([bathrooms]) => parseInt(bathrooms));

        // Set priceRange to null unless both min and max are > 0 and min <= max
        const priceRange = preferences.priceRange.min !== Infinity &&
            preferences.priceRange.max > 0 &&
            preferences.priceRange.min <= preferences.priceRange.max ?
            preferences.priceRange : null;

        return {
            topPropertyTypes,
            topLocations,
            topBedrooms,
            topBathrooms,
            priceRange,
            searchQueries: preferences.searchQueries.slice(0, 10),
            interactionScores: preferences.interactionScores
        };
    } catch (error) {
        logger.error("Error analyzing user behavior:", error);
        return null;
    }
};

// Build structured prompt for OpenAI
const buildRecommendationPrompt = (userPreferences, availableProperties, userLocation) => {
    const prompt = `You are an expert real estate AI assistant. Based on the following user preferences and available properties, provide personalized property recommendations.

User Preferences:
- Preferred Property Types: ${userPreferences.topPropertyTypes.join(', ') || 'Not specified'}
- Preferred Locations: ${userPreferences.topLocations.join(', ') || 'Not specified'}
- Preferred Bedrooms: ${userPreferences.topBedrooms.join(', ') || 'Not specified'}
- Preferred Bathrooms: ${userPreferences.topBathrooms.join(', ') || 'Not specified'}
- Price Range: ${userPreferences.priceRange ? `$${Number(userPreferences.priceRange.min).toLocaleString('en-US')} - $${Number(userPreferences.priceRange.max).toLocaleString('en-US')}` : 'Not specified'}
- Recent Search Queries: ${userPreferences.searchQueries.join(', ') || 'None'}

Available Properties (${availableProperties.length} properties):
${availableProperties.map(prop =>
        `- ${prop.title} (${prop.propertyType}): ${prop.bedrooms} bed, ${prop.bathrooms} bath, $${Number(prop.price).toLocaleString('en-US')}, ${prop.city}, ${prop.state}`
    ).join('\n')}

User Location: ${userLocation ? `${userLocation.latitude}, ${userLocation.longitude}` : 'Not available'}

Please provide:
1. Top 5 most relevant property recommendations with specific reasons why each property matches the user's preferences
2. For each recommendation, include:
   - Property ID
   - Relevance score (0-100)
   - Specific reasons for recommendation
   - Recommendation type (SIMILAR_PROPERTY, LOCATION_BASED, PREFERENCE_MATCH, MARKET_INSIGHT)
   - Confidence level (HIGH, MEDIUM, LOW)

Return only valid JSON array with the following structure:
[
  {
    "propertyId": "uuid",
    "relevanceScore": 85,
    "recommendationReason": "This property matches your preference for 3-bedroom homes in Austin and is within your price range",
    "recommendationType": "PREFERENCE_MATCH",
    "confidenceLevel": "HIGH"
  }
]`;

    return prompt;
};

// Process OpenAI response with improved JSON parsing
const processGeminiAIResponse = (response) => {
    try {
        const content = response.choices[0].message.content;

        // Extract JSON between first `[` and matching `]`
        let jsonStart = content.indexOf('[');
        let jsonEnd = content.lastIndexOf(']');

        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('No JSON array found in response');
        }

        // Extract the JSON part
        let jsonContent = content.substring(jsonStart, jsonEnd + 1);

        // Strip ```json code fences if present
        if (jsonContent.includes('```json')) {
            jsonContent = jsonContent.replace(/```json\s*/, '').replace(/\s*```/, '');
        } else if (jsonContent.includes('```')) {
            jsonContent = jsonContent.replace(/```\s*/, '').replace(/\s*```/, '');
        }

        const recommendations = JSON.parse(jsonContent);

        if (!Array.isArray(recommendations)) {
            throw new Error('Invalid response format from GeminiAI');
        }

        return recommendations.map(rec => {
            // Validate each item has propertyId (UUID)
            if (!rec.propertyId || typeof rec.propertyId !== 'string') {
                throw new Error('Invalid propertyId in recommendation');
            }

            // Coerce scores to numbers
            const relevanceScore = Number(rec.relevanceScore) || 50;
            const confidenceLevel = rec.confidenceLevel || 'MEDIUM';

            return {
                propertyId: rec.propertyId,
                relevanceScore: Math.min(100, Math.max(0, relevanceScore)),
                recommendationReason: rec.recommendationReason || 'AI-generated recommendation',
                recommendationType: rec.recommendationType || 'PREFERENCE_MATCH',
                confidenceLevel
            };
        });
    } catch (error) {
        logger.error("Error processing Gemini response:", error);
        return [];
    }
};

exports.generatePersonalizedRecommendations = async (userId, userLocation = null, limit = 10) => {
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return {
                error: "User not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const userPreferences = await analyzeUserBehavior(userId);
        if (!userPreferences) {
            return {
                error: "Unable to analyze user behavior",
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR
            };
        }

        const availableProperties = await Property.findAll({
            where: {
                isActive: true,
                propertyId: { [Op.ne]: null }
            },
            include: [
                {
                    model: Listing,
                    as: 'listings',
                    where: { listingStatus: 'ACTIVE' },
                    required: false
                }
            ],
            limit: 50 
        });

        if (availableProperties.length === 0) {
            return {
                error: "No available properties found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        const propertiesWithProximity = availableProperties.map(property => {
            let proximityScore = 0;
            if (userLocation && property.latitude && property.longitude) {
                const lat = parseFloat(property.latitude);
                const lon = parseFloat(property.longitude);
                if (Number.isFinite(lat) && Number.isFinite(lon)) {
                    const distance = calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        lat,
                        lon
                    );
                    proximityScore = calculateProximityScore(distance);
                }
            }
            return { ...property.toJSON(), proximityScore };
        });

        // Build prompt for OpenAI
        const prompt = buildRecommendationPrompt(userPreferences, propertiesWithProximity, userLocation);

        // Call OpenAI API
        if (!GEMINI_API_KEY) {
            // Fallback to heuristic recommendations when OpenAI is unavailable
            logger.warn("Gemini API key not configured, using fallback recommendations");

            const fallbackRecommendations = propertiesWithProximity
                .sort((a, b) => b.proximityScore - a.proximityScore)
                .slice(0, limit)
                .map((property, index) => ({
                    propertyId: property.propertyId,
                    relevanceScore: Math.max(50, 100 - (index * 10)),
                    recommendationReason: `Property matches your preferences and is ${index === 0 ? 'closest to your location' : 'in your preferred area'}`,
                    recommendationType: 'PREFERENCE_MATCH',
                    confidenceLevel: 'MEDIUM'
                }));

            // Create recommendation records for fallback
            const recommendationRecords = [];
            for (const aiRec of fallbackRecommendations) {
                try {
                    const recommendation = await Recommendation.create({
                        userId,
                        propertyId: aiRec.propertyId,
                        recommendationType: aiRec.recommendationType,
                        recommendationReason: aiRec.recommendationReason,
                        confidenceScore: aiRec.relevanceScore / 100,
                        relevanceScore: (aiRec.relevanceScore ?? 50) / 100,
                        status: 'ACTIVE',
                        algorithmVersion: 'fallback-v1'
                    });
                    recommendationRecords.push(recommendation);
                } catch (error) {
                    logger.error("Error creating fallback recommendation record:", error);
                }
            }

            // Get full property details for recommendations
            const recommendationsWithDetails = await Promise.all(
                recommendationRecords.map(async (rec) => {
                    const property = await Property.findByPk(rec.propertyId, {
                        include: [
                            {
                                model: User,
                                as: 'owner',
                                attributes: ['userId', 'firstName', 'lastName', 'email']
                            },
                            {
                                model: PropertyMedia,
                                as: 'media',
                                attributes: ['mediaId', 'cloudinaryUrl', 'mediaType', 'isMainImage']
                            }
                        ]
                    });

                    return {
                        recommendation: rec,
                        property,
                        aiInsights: {
                            relevanceScore: rec.relevanceScore * 100,
                            confidenceLevel: rec.confidenceScore > 0.8 ? 'HIGH' : rec.confidenceScore > 0.6 ? 'MEDIUM' : 'LOW'
                        }
                    };
                })
            );

            return {
                data: {
                    recommendations: recommendationsWithDetails,
                    userPreferences,
                    totalGenerated: recommendationRecords.length
                },
                statusCode: StatusCodes.OK
            };
        }
//completions
        const geminiAIResponse = await gemini.chats.create({
            model:MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an expert real estate AI assistant that provides personalized property recommendations based on user preferences and available properties. Return only valid JSON array."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: GEMINI_MAX_TOKENS,
            temperature: GEMINI_TEMPERATURE,
            response_format: { type: 'json_object' }
        });

        // Process OpenAI response
        const aiRecommendations = processGeminiAIResponse(geminiAIResponse);

        if (aiRecommendations.length === 0) {
            return {
                error: "Unable to generate AI recommendations",
                statusCode: StatusCodes.INTERNAL_SERVER_ERROR
            };
        }

        // Create recommendation records
        const recommendationRecords = [];
        for (const aiRec of aiRecommendations.slice(0, limit)) {
            try {
                // Calculate distance and location data if available
                let distanceKm = null;
                let propertyLocation = null;

                if (userLocation) {
                    const property = availableProperties.find(p => p.propertyId === aiRec.propertyId);
                    if (property && property.latitude && property.longitude) {
                        const lat = parseFloat(property.latitude);
                        const lon = parseFloat(property.longitude);
                        if (Number.isFinite(lat) && Number.isFinite(lon)) {
                            distanceKm = calculateDistance(
                                userLocation.latitude,
                                userLocation.longitude,
                                lat,
                                lon
                            );
                            propertyLocation = { latitude: lat, longitude: lon };
                        }
                    }
                }

                const recommendation = await Recommendation.create({
                    userId,
                    propertyId: aiRec.propertyId,
                    recommendationType: aiRec.recommendationType,
                    recommendationReason: aiRec.recommendationReason,
                    confidenceScore: aiRec.relevanceScore / 100,
                    relevanceScore: (aiRec.relevanceScore ?? 50) / 100,
                    status: 'ACTIVE',
                    userLocation: userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
                    propertyLocation,
                    distanceKm,
                    userPreferences,
                    algorithmVersion: 'ai-v1'
                });
                recommendationRecords.push(recommendation);
            } catch (error) {
                logger.error("Error creating recommendation record:", error);
            }
        }

        // Get full property details for recommendations
        const recommendationsWithDetails = await Promise.all(
            recommendationRecords.map(async (rec) => {
                const property = await Property.findByPk(rec.propertyId, {
                    include: [
                        {
                            model: User,
                            as: 'owner',
                            attributes: ['userId', 'firstName', 'lastName', 'email']
                        },
                        {
                            model: PropertyMedia,
                            as: 'media',
                            attributes: ['mediaId', 'cloudinaryUrl', 'mediaType', 'isMainImage']
                        }
                    ]
                });

                return {
                    recommendation: rec,
                    property,
                    aiInsights: {
                        relevanceScore: rec.relevanceScore * 100,
                        confidenceLevel: rec.confidenceScore > 0.8 ? 'HIGH' : rec.confidenceScore > 0.6 ? 'MEDIUM' : 'LOW'
                    }
                };
            })
        );

        return {
            data: {
                recommendations: recommendationsWithDetails,
                userPreferences,
                totalGenerated: recommendationRecords.length
            },
            statusCode: StatusCodes.OK
        };

    } catch (error) {
        logger.error("Error generating personalized recommendations:", error);

        if (error.status === 401) {
            return {
                error: "GeminiAI API authentication failed",
                statusCode: StatusCodes.UNAUTHORIZED
            };
        } else if (error.status === 429) {
            return {
                error: "GeminiAI API rate limit exceeded",
                statusCode: StatusCodes.TOO_MANY_REQUESTS
            };
        }

        return {
            error: error.message || "Internal server error",
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

// Get user's recommendation history
exports.getUserRecommendations = async (userId, page = 1, limit = 10) => {
    try {
        const offset = (page - 1) * limit;

        const recommendations = await Recommendation.findAndCountAll({
            where: { userId },
            include: [
                {
                    model: Property,
                    as: 'property',
                    include: [
                        {
                            model: User,
                            as: 'owner',
                            attributes: ['userId', 'firstName', 'lastName', 'email']
                        },
                        {
                            model: PropertyMedia,
                            as: 'media',
                            attributes: ['mediaId', 'cloudinaryUrl', 'mediaType', 'isMainImage']
                        }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        return {
            data: {
                recommendations: recommendations.rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(recommendations.count / limit),
                    totalItems: recommendations.count,
                    itemsPerPage: limit
                }
            },
            statusCode: StatusCodes.OK
        };

    } catch (error) {
        logger.error("Error fetching user recommendations:", error);
        return {
            error: error.message || "Internal server error",
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

// Update recommendation status
exports.updateRecommendationStatus = async (recommendationId, userId, status) => {
    try {
        const recommendation = await Recommendation.findOne({
            where: { recommendationId, userId }
        });

        if (!recommendation) {
            return {
                error: "Recommendation not found",
                statusCode: StatusCodes.NOT_FOUND
            };
        }

        await recommendation.update({ status });

        return {
            data: { recommendation },
            statusCode: StatusCodes.OK
        };

    } catch (error) {
        logger.error("Error updating recommendation status:", error);
        return {
            error: error.message || "Internal server error",
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};

// Get recommendation analytics
exports.getRecommendationAnalytics = async (userId) => {
    try {
        const analytics = await Recommendation.findAll({
            where: { userId },
            attributes: [
                'recommendationType',
                'confidenceScore',
                'relevanceScore',
                'status',
                'createdAt'
            ]
        });

        const typeDistribution = {};
        const averageScores = {
            confidence: 0,
            relevance: 0
        };
        let totalRecommendations = analytics.length;

        analytics.forEach(rec => {
            // Type distribution
            typeDistribution[rec.recommendationType] = (typeDistribution[rec.recommendationType] || 0) + 1;

            // Average scores
            averageScores.confidence += rec.confidenceScore || 0;
            averageScores.relevance += rec.relevanceScore || 0;
        });

        if (totalRecommendations > 0) {
            averageScores.confidence /= totalRecommendations;
            averageScores.relevance /= totalRecommendations;
        }

        return {
            data: {
                totalRecommendations,
                typeDistribution,
                averageScores,
                recentRecommendations: analytics.slice(0, 10)
            },
            statusCode: StatusCodes.OK
        };

    } catch (error) {
        logger.error("Error fetching recommendation analytics:", error);
        return {
            error: error.message || "Internal server error",
            statusCode: StatusCodes.INTERNAL_SERVER_ERROR
        };
    }
};
