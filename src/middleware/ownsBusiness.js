const Business = require('../model/business.model'); // teammate's model, adjust path and field names
const AppError = require('../utils/AppError');

module.exports = async (req, res, next) => {
  const business = await Business.findOne({
    _id: req.params.businessId,
    owner: req.user.id,
  });
  if (!business) throw new AppError('You do not have access to this business', 403);
  next();
};