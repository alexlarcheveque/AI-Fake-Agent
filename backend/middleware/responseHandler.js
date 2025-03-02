/**
 * Response handler middleware to standardize API responses
 */
const responseHandler = (req, res, next) => {
  // Success response helper
  res.success = (data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  // Error response helper
  res.error = (
    message = "An error occurred",
    statusCode = 500,
    errors = null
  ) => {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  };

  // Created response helper
  res.created = (data, message = "Resource created successfully") => {
    return res.success(data, message, 201);
  };

  // Not found helper
  res.notFound = (message = "Resource not found") => {
    return res.error(message, 404);
  };

  // Unauthorized helper
  res.unauthorized = (message = "Unauthorized access") => {
    return res.error(message, 401);
  };

  // Bad request helper
  res.badRequest = (message = "Bad request", errors = null) => {
    return res.error(message, 400, errors);
  };

  next();
};

module.exports = responseHandler;
