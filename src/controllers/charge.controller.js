import * as chargeService from "../services/charge.service.js";

export const create = async (req, res) => {
  const charge = await chargeService.createCharge(req.params.businessId, req.body);
  res.status(201).json({ status: "success", data: charge });
};

export const getAll = async (req, res) => {
  const charges = await chargeService.getCharges(req.params.businessId);
  res.json({ status: "success", results: charges.length, data: charges });
};

export const update = async (req, res) => {
  const charge = await chargeService.updateCharge(
    req.params.businessId,
    req.params.chargeId,
    req.body
  );
  res.json({ status: "success", data: charge });
};