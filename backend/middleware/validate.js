const logger = require("../utils/logger");

/**
 * Creates a validation middleware with the given schema
 * @param {Object} schema - Joi schema for validation
 * @param {String} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!error) {
      // Update request with validated and sanitized data
      req[property] = value;
      return next();
    }

    // Format validation errors
    const errors = error.details.reduce((acc, detail) => {
      const key = detail.path.join(".");
      acc[key] = detail.message.replace(/["']/g, "");
      return acc;
    }, {});

    logger.debug("Validation error:", errors);

    return res.badRequest("Validation error", errors);
  };
};

module.exports = validate;
