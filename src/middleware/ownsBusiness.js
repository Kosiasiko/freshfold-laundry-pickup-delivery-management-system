/**
 * Business-scoped access control.
 * Ensures the authenticated user can only access resources belonging to
 * their assigned business. Administrators bypass this check.
 *
 * Expects req.params.businessId and req.user (populated by authenticate).
 */
export const assertBusinessAccess = (req, res, next) => {
  const { businessId } = req.params;
  if (!businessId) {
    return res.status(400).json({
      success: false,
      message: "businessId is required.",
    });
  }
  if (req.user.role === "Administrator") {
    return next();
  }
  if (!req.user.businessId || req.user.businessId.toString() !== businessId) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this business.",
    });
  }
  next();
};
