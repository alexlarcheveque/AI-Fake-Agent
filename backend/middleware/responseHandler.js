/**
 * Response handler middleware to standardize API responses
 */
const responseHandler = (req, res, next) => {
  // Add success method
  res.success = (data) => {
    return res.json({
      status: 'success',
      data
    });
  };

  // Add created method
  res.created = (data) => {
    return res.status(201).json({
      status: 'success',
      data
    });
  };

  // Add error method
  res.error = (message, statusCode = 400) => {
    return res.status(statusCode).json({
      status: 'error',
      message
    });
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
