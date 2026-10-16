export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Request body must contain valid JSON.",
    });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large.",
    });
  }
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A record with that unique value already exists.",
    });
  }

  console.error("Unhandled request error:", error);
  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
}
