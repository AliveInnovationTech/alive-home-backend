"use strict"
const response = require("../utils/responses");
const AIRecommendationService = require("../services/AIRecommendationService");




exports.generatePersonalizedRecommendations = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await AIRecommendationService.
        generatePersonalizedRecommendations(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.getUserRecommendations = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await AIRecommendationService.
        getUserRecommendations(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.updateRecommendationStatus = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await AIRecommendationService.
        updateRecommendationStatus(req.params.recommendationId,
            req.params.userId, req.body.status);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}

exports.getRecommendationAnalytics = async (req, res) => {
    const {
        error,
        statusCode,
        data
    } = await AIRecommendationService.getRecommendationAnalytics(req.params.userId);

    if (error) return response.error(res, error, statusCode);

    return response.success(res, data, statusCode);
}
