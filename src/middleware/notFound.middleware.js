export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `The request address not found: ${req.method} ${req.originalUrl}`,
  });
};
