const RATE_PER_KM = 200;
const BASE_FEE = 0;

const calculateDeliveryFee = (distanceKm) => {
  const distance = Number(distanceKm);

  if (!Number.isFinite(distance) || distance < 0.1 || distance > 1000) {
    throw new Error("Invalid delivery distance.");
  }

  return Math.round(distance * RATE_PER_KM) + BASE_FEE;
};

const calculatePickupFee = (distanceKm) => {
  return calculateDeliveryFee(distanceKm);
};

export { calculatePickupFee, calculateDeliveryFee };
