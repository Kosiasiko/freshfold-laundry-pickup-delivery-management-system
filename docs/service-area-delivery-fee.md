# Service Area & Delivery Fee Endpoints

## Base Path
`/api/v1/service-areas`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Public | List active service areas |
| POST | `/` | Administrator | Create a service area (name, locations, geometry, fees) |
| PUT | `/:areaId` | Administrator | Update a service area |
| POST | `/validate-address` | Public | Validate pickup/delivery addresses against active service areas; returns `supported` boolean and `deliveryFee` |

## Delivery Fee Calculation

- Fee is taken from the matched service area (`deliveryFee` in kobo).
- If both pickup and delivery areas match, the higher fee applies.
- Unsupported locations return `supported: false` and should block booking creation.

## Order Pricing

`Order.deliveryFee` (kobo) is stored on the order and included in `totalAmount`. Commission is calculated on `totalAmount - deliveryFee` by default.
