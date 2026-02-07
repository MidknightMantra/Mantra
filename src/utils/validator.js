/**
 * Input Validation Utility
 * Provides common validation schemas and helpers using Joi
 */

import Joi from 'joi';

/**
 * Common validation schemas
 */
export const schemas = {
    // URL validation
    url: Joi.string().uri({ scheme: ['http', 'https'] }).required()
        .messages({
            'string.uri': 'Please provide a valid URL',
            'any.required': 'URL is required'
        }),

    // YouTube URL validation
    youtubeUrl: Joi.string().pattern(/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/).required()
        .messages({
            'string.pattern.base': 'Please provide a valid YouTube URL',
            'any.required': 'YouTube URL is required'
        }),

    // Text input (1-5000 characters)
    text: Joi.string().min(1).max(5000).required()
        .messages({
            'string.min': 'Text cannot be empty',
            'string.max': 'Text is too long (max 5000 characters)',
            'any.required': 'Text is required'
        }),

    // Short text (commands, searches)
    shortText: Joi.string().min(1).max(500).required()
        .messages({
            'string.min': 'Input cannot be empty',
            'string.max': 'Input is too long (max 500 characters)',
            'any.required': 'Input is required'
        }),

    // Number validation
    number: Joi.number().integer().min(1).required()
        .messages({
            'number.base': 'Must be a number',
            'number.integer': 'Must be a whole number',
            'number.min': 'Must be at least 1',
            'any.required': 'Number is required'
        }),

    // Phone number validation
    phoneNumber: Joi.string().pattern(/^\d{10,15}$/)
        .messages({
            'string.pattern.base': 'Invalid phone number format (10-15 digits)',
        }),

    // Language code (ISO 639-1)
    languageCode: Joi.string().length(2).uppercase()
        .messages({
            'string.length': 'Language code must be 2 characters (e.g., EN, ES)',
            'string.uppercase': 'Language code must be uppercase'
        }),

    // Verse number (Bible/Quran)
    verseNumber: Joi.number().integer().min(1).max(300).required()
        .messages({
            'number.min': 'Verse number must be at least 1',
            'number.max': 'Verse number too high',
            'any.required': 'Verse number is required'
        })
};

/**
 * Validate data against a schema
 * @param {any} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @returns {any} Validated value
 * @throws {Error} Validation error with user-friendly message
 */
export function validate(data, schema) {
    const { error, value } = schema.validate(data, {
        abortEarly: true, // Stop on first error
        stripUnknown: true // Remove unknown fields
    });

    if (error) {
        throw new Error(error.details[0].message);
    }

    return value;
}

/**
 * Validate URL input
 * @param {string} url - URL to validate
 * @returns {string} Validated URL
 */
export function validateUrl(url) {
    return validate(url, schemas.url);
}

/**
 * Validate YouTube URL
 * @param {string} url - YouTube URL to validate
 * @returns {string} Validated URL
 */
export function validateYouTubeUrl(url) {
    return validate(url, schemas.youtubeUrl);
}

/**
 * Validate text input
 * @param {string} text - Text to validate
 * @param {boolean} short - Use short text validation (500 chars)
 * @returns {string} Validated text
 */
export function validateText(text, short = false) {
    return validate(text, short ? schemas.shortText : schemas.text);
}

/**
 * Validate number input
 * @param {any} num - Number to validate
 * @returns {number} Validated number
 */
export function validateNumber(num) {
    return validate(num, schemas.number);
}
