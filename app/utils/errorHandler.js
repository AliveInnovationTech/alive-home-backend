"use strict";

const logger = require('./logger');

/**
 * Centralized error handling utility for services
 * @param {string} serviceName - Name of the service where error occurred
 * @param {string} methodName - Name of the method where error occurred
 * @param {Error} error - The error object
 * @param {string} customMessage - Optional custom error message
 * @param {number} statusCode - Optional custom status code (defaults to 500)
 * @returns {Object} Standardized error response object
 */
const handleServiceError = (serviceName, methodName, error, customMessage = null, statusCode = 500) => {
    const errorMessage = customMessage || error.message || 'An unknown error occurred';
    
    // Log the error with structured information
    logger.error('Service error occurred', {
        service: serviceName,
        method: methodName,
        error: errorMessage,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });

    // Return standardized error response object
    return {
        error: errorMessage,
        statusCode: statusCode
    };
};

/**
 * Log information messages
 * @param {string} message - The message to log
 * @param {Object} meta - Optional metadata object
 */
const logInfo = (message, meta = {}) => {
    logger.info(message, meta);
};

/**
 * Log warning messages
 * @param {string} message - The warning message
 * @param {Object} meta - Optional metadata object
 */
const logWarning = (message, meta = {}) => {
    logger.warn(message, meta);
};

/**
 * Log debug messages
 * @param {string} message - The debug message
 * @param {Object} meta - Optional metadata object
 */
const logDebug = (message, meta = {}) => {
    logger.debug(message, meta);
};

module.exports = {
    handleServiceError,
    logInfo,
    logWarning,
    logDebug
};
