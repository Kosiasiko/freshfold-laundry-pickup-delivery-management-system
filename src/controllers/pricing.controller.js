import * as pricingService from "../services/pricing.service.js";

export const create = async (req, res) => {
  const price = await pricingService.createPrice(req.params.businessId, req.body);
  res.status(201).json({ status: "success", data: price });
};

export const getAll = async (req, res) => {
  const prices = await pricingService.getPrices(req.params.businessId);
  res.json({ status: "success", results: prices.length, data: prices });
};

export const update = async (req, res) => {
  const price = await pricingService.updatePrice(
    req.params.businessId,
    req.params.priceId,
    req.body
  );
  res.json({ status: "success", data: price });
};

export const calculate = async (req, res) => {
  const result = await pricingService.calculateOrderCost(
    req.params.businessId,
    req.body
  );
  res.json({ status: "success", data: result });
};