# Pricing and Cost Calculation

## Pricing methods
| Method | Measured by | Input field |
|---|---|---|
| PER_ITEM | number of items | `quantity` (whole number) |
| PER_KG | weight | `weightKg` (decimals allowed, max 500) |
| PER_LOAD | number of loads | `loads` (whole number, max 100) |

## Rules
- All money is stored and returned in **kobo** (₦1,500 = 150000).
- `amount` must be a positive whole number.
- `itemName` is required when `pricingMethod` is PER_ITEM.
- A business cannot have two identical prices (same service, item and method).
- Inactive prices cannot be used in calculations.
- Only the owner of a business can create or update its prices (403 otherwise).
- When an order is confirmed, the calculated lines are saved as a snapshot. Later price changes do not affect existing orders.

All endpoints require `Authorization: Bearer <token>`.
Base path: `/api/businesses/:businessId/prices`

## Endpoints

### Create a price
`POST /api/businesses/:businessId/prices`
```json
{ "serviceName": "Wash & Fold", "pricingMethod": "PER_KG", "amount": 100000 }
```
Returns `201` with the created price. `409` if it already exists.

### Get prices
`GET /api/businesses/:businessId/prices`
Returns `200` with a list of prices.

### Update a price
`PATCH /api/businesses/:businessId/prices/:priceId`
```json
{ "amount": 120000 }
```
Send only the fields to change. Returns `200`, or `404` if the price is not found.

### Calculate an order
`POST /api/businesses/:businessId/prices/calculate`
```json
{
  "lines": [
    { "priceId": "<id>", "weightKg": 2.5 },
    { "priceId": "<id>", "quantity": 3 }
  ],
  "deliveryRequired": true,
  "extraCharges": [{ "name": "Express", "amount": 20000 }]
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "lines": [ { "priceId": "...", "pricingMethod": "PER_KG", "unitAmount": 100000, "measure": 2.5, "lineTotal": 250000 } ],
    "subtotal": 250000,
    "deliveryFee": 50000,
    "extraCharges": [ { "name": "Express", "amount": 20000 } ],
    "total": 320000,
    "currency": "NGN"
  }
}
```

## Errors
| Code | Meaning |
|---|---|
| 400 | Validation failed (bad quantity, weight, loads or price) |
| 401 | Not logged in |
| 403 | Business does not belong to the user |
| 404 | Price not found |
| 409 | Duplicate price |