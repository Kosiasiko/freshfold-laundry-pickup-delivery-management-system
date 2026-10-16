export const errorHandler = (err, req, res, next) => {
  if (res.headerSent) {
    return next(err);
  }

  const statusCode = err.statuscode || err.status || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    status: statusCode,
    success: false,
    message:
      statusCode >= 500
        ? " An unexpected server error occured. Please try again later."
        : err.message || "request failed.",
  });
};
