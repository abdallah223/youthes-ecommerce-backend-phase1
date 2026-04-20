# Youthes E-Commerce — Backend API (Phase1)

REST API for the Youthes youth fashion e-commerce platform serving the Egyptian market. Built with Node.js, Express, and MongoDB.

---

## Tech Stack

| Layer          | Technology            |
| -------------- | --------------------- |
| Runtime        | Node.js               |
| Framework      | Express.js            |
| Database       | MongoDB + Mongoose    |
| Authentication | JWT (JSON Web Tokens) |
| File Upload    | Multer                |
| Logging        | Winston               |
| Environment    | dotenv                |

---

## Project Structure

```
server/
├── src/
│   ├── configs/
│   │   ├── db.js               # MongoDB connection
│   │   └── env.js              # Environment variables
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── cart.controller.js
│   │   ├── category.controller.js
│   │   ├── order.controller.js
│   │   ├── product.controller.js
│   │   ├── static-content.controller.js
│   │   ├── testimonial.controller.js
│   │   └── user.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT protect + role authorize
│   │   ├── error.middleware.js  # Global error handler
│   │   └── upload.middleware.js # Multer image upload
│   ├── models/
│   │   ├── cart.model.js
│   │   ├── category.model.js
│   │   ├── order.model.js
│   │   ├── product.model.js
│   │   ├── static-content.model.js
│   │   ├── testimonial.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── auth.route.js
│   │   ├── cart.route.js
│   │   ├── category.route.js
│   │   ├── order.route.js
│   │   ├── product.route.js
│   │   ├── static-content.route.js
│   │   ├── testimonial.route.js
│   │   └── user.route.js
│   └── utils/
│       ├── app-error.js        # Custom error class
│       ├── async-handler.js    # Async wrapper
│       ├── helpers.util.js     # Slug generator
│       └── logger.js           # Winston logger
├── uploads/
│   └── products/               # Uploaded product images
├── index.js                    # App entry point
├── .env
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone https://github.com/abdallah223/youthes-ecommerce-backend-phase1.git
cd youthes_e-commerce/server
npm install
```

### Environment Variables

Create a `.env` file in the server root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/youthes
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
SHIPPING_FEE=50
NODE_ENV=development
```

### Run

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server runs at `http://localhost:3000`

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint         | Access    | Description         |
| ------ | ---------------- | --------- | ------------------- |
| POST   | `/auth/register` | Public    | Register new user   |
| POST   | `/auth/login`    | Public    | Login — returns JWT |
| POST   | `/auth/logout`   | Protected | Logout              |

**Login payload:**

```json
{ "email": "user@example.com", "password": "Password1" }
```

**Register payload:**

```json
{
  "fullName": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "password": "Password1",
  "gender": "male",
  "address": "Cairo, Egypt"
}
```

**Auth header for protected routes:**

```
Authorization: Bearer <token>
```

---

### Products

| Method | Endpoint              | Access | Description                          |
| ------ | --------------------- | ------ | ------------------------------------ |
| GET    | `/products`           | Public | List products with filters           |
| GET    | `/products/:slug`     | Public | Get single product                   |
| GET    | `/products/admin/all` | Admin  | List all products including deleted  |
| POST   | `/products`           | Admin  | Create product (multipart/form-data) |
| PUT    | `/products/:id`       | Admin  | Update product                       |
| DELETE | `/products/:id`       | Admin  | Soft delete product                  |

**Query params for GET `/products`:**

| Param         | Type     | Description                                                       |
| ------------- | -------- | ----------------------------------------------------------------- |
| `page`        | number   | Page number (default: 1)                                          |
| `limit`       | number   | Items per page (default: 10)                                      |
| `category`    | ObjectId | Filter by category ID                                             |
| `subcategory` | ObjectId | Filter by subcategory ID                                          |
| `search`      | string   | Search in name and description                                    |
| `sort`        | string   | `newest` `oldest` `name_asc` `name_desc` `price_asc` `price_desc` |

**Response shape (no `data` wrapper):**

```json
{
  "success": true,
  "products": [...],
  "meta": { "page": 1, "limit": 10, "total": 50, "pages": 5 }
}
```

**Create product** — `multipart/form-data` fields:
| Field | Type | Required |
|---|---|---|
| `name` | string | ✅ |
| `description` | string | ✅ |
| `price` | number | ✅ |
| `stockCount` | number | ✅ |
| `category` | ObjectId | ✅ |
| `subcategory` | ObjectId | ❌ |
| `image` | file (jpg/png/webp, max 2MB) | ✅ on create |

Product images are served at:

```
http://localhost:3000/uploads/products/<filename>
```

---

### Categories

| Method | Endpoint                               | Access | Description                          |
| ------ | -------------------------------------- | ------ | ------------------------------------ |
| GET    | `/categories`                          | Public | Active categories with subcategories |
| GET    | `/categories/admin`                    | Admin  | All categories                       |
| POST   | `/categories`                          | Admin  | Create category                      |
| PUT    | `/categories/:id`                      | Admin  | Update category                      |
| DELETE | `/categories/:id`                      | Admin  | Delete category                      |
| POST   | `/categories/:id/subcategories`        | Admin  | Add subcategory                      |
| PUT    | `/categories/:id/subcategories/:subId` | Admin  | Update subcategory                   |
| DELETE | `/categories/:id/subcategories/:subId` | Admin  | Delete subcategory                   |

---

### Cart

All cart routes require authentication.

| Method | Endpoint                         | Description                                             |
| ------ | -------------------------------- | ------------------------------------------------------- |
| GET    | `/cart`                          | Get current user cart                                   |
| POST   | `/cart/items`                    | Add item `{ productId, quantity }`                      |
| PUT    | `/cart/items/:productId`         | Update quantity `{ quantity }`                          |
| DELETE | `/cart/items/:productId`         | Remove item                                             |
| DELETE | `/cart`                          | Clear cart                                              |
| POST   | `/cart/merge`                    | Merge guest cart `{ items: [{ productId, quantity }] }` |
| PATCH  | `/cart/confirm-price/:productId` | Confirm price change (pass `all` for all items)         |

---

### Orders

| Method | Endpoint                      | Access | Description                   |
| ------ | ----------------------------- | ------ | ----------------------------- |
| POST   | `/orders`                     | User   | Place order                   |
| GET    | `/orders/my`                  | User   | My orders list                |
| GET    | `/orders/my/:id`              | User   | Single order                  |
| PATCH  | `/orders/my/:id/cancel`       | User   | Cancel order (Pending only)   |
| GET    | `/orders/admin`               | Admin  | All orders with filters       |
| GET    | `/orders/admin/:id`           | Admin  | Single order (populated)      |
| PATCH  | `/orders/admin/:id/status`    | Admin  | Update status                 |
| GET    | `/orders/admin/reports/sales` | Admin  | Sales report                  |
| GET    | `/orders/admin/notifications` | Admin  | Pending + out-of-stock counts |

**Order statuses:**

```
Pending → Prepared → Shipped → Delivered
       ↘ CancelledByAdmin / Rejected
Pending → CancelledByUser
```

**Stock behavior:**

- Stock is **decremented** immediately when an order is placed
- Stock is **returned** if the order is cancelled or rejected at any stage

**Place order payload:**

```json
{
  "deliveryPhone": "01012345678",
  "deliveryAddress": "123 Street, Cairo"
}
```

**Update status payload (admin):**

```json
{ "status": "Prepared", "note": "optional reason" }
```

**Sales report query params:**
| Param | Format | Default |
|---|---|---|
| `dateFrom` | YYYY-MM-DD | First day of current month |
| `dateTo` | YYYY-MM-DD | Today |

---

### Testimonials

| Method | Endpoint                  | Access    | Description                  |
| ------ | ------------------------- | --------- | ---------------------------- |
| GET    | `/testimonials/approved`  | Public    | All approved testimonials    |
| POST   | `/testimonials`           | User only | Submit review (one per user) |
| GET    | `/testimonials/admin`     | Admin     | All testimonials with filter |
| PATCH  | `/testimonials/admin/:id` | Admin     | Update status                |

**Submit payload:**

```json
{ "reviewText": "Great quality!", "rating": 5 }
```

**Admin status options:** `pending` `approved` `rejected` `ignored`

---

### Users

| Method | Endpoint                    | Access    | Description                 |
| ------ | --------------------------- | --------- | --------------------------- |
| GET    | `/users/me`                 | Protected | Get own profile             |
| PUT    | `/users/me`                 | Protected | Update profile              |
| POST   | `/users/me/change-password` | Protected | Change password             |
| GET    | `/users`                    | Admin     | All users (role: user only) |
| PATCH  | `/users/:id/toggle`         | Admin     | Activate / deactivate user  |

---

### Static Pages

| Method | Endpoint                  | Access | Description       |
| ------ | ------------------------- | ------ | ----------------- |
| GET    | `/pages/:key`             | Public | Get page content  |
| PUT    | `/pages/admin/about_us`   | Admin  | Update About Us   |
| PUT    | `/pages/admin/faq`        | Admin  | Update FAQ        |
| PUT    | `/pages/admin/contact_us` | Admin  | Update Contact Us |

**Page keys:** `about_us` `faq` `contact_us`

**Update About Us payload:**

```json
{ "title": "Our Story", "body": "Long text here..." }
```

**Update FAQ payload:**

```json
{ "items": [{ "question": "...", "answer": "..." }] }
```

**Update Contact Us payload:**

```json
{
  "phone": "01012345678",
  "email": "hello@youthes.com",
  "address": "Cairo, Egypt",
  "workingHours": "Saturday – Thursday, 9AM – 10PM",
  "socialLinks": [
    { "label": "Instagram", "url": "https://instagram.com/youthes" }
  ]
}
```

---

## Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human readable message",
  "errors": [{ "field": "email", "message": "Invalid email address" }]
}
```

Common HTTP status codes used:

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 201  | Created                                 |
| 400  | Bad request / validation error          |
| 401  | Unauthorized — missing or invalid token |
| 403  | Forbidden — insufficient role           |
| 404  | Not found                               |
| 500  | Internal server error                   |

---

## Roles

| Role    | Description                                   |
| ------- | --------------------------------------------- |
| `user`  | Registered customer — can shop, order, review |
| `admin` | Full access to admin endpoints                |

Default role on registration is `user`. Admin accounts must be created directly in the database.

---

## Seeding Initial Data

To create the first admin account, insert directly into MongoDB:

```js
db.users.updateOne({ email: "admin@youthes.com" }, { $set: { role: "admin" } });
```

To seed static pages (required before About Us / FAQ / Contact Us pages work):

```js
db.staticcontents.insertMany([
  {
    pageKey: "about_us",
    content: { title: "About Us", body: "Your content here." },
  },
  { pageKey: "faq", content: [] },
  {
    pageKey: "contact_us",
    content: {
      phone: "",
      email: "",
      address: "",
      workingHours: "",
      socialLinks: [],
    },
  },
]);
```

---

## Logging

Logs are written to console and to log files via Winston. All significant actions are logged including order creation, status changes, product operations, and errors.

---

## License

MIT
## Portfolio Docs

- Human-friendly API guide: [docs/api-portfolio.md](./docs/api-portfolio.md)
- OpenAPI spec: [docs/openapi.yaml](./docs/openapi.yaml)
